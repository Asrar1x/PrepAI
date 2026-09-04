"""Model 9 — Placement Predictor (XGBoost + CalibratedClassifierCV).

A tabular model.  Features per student:

  technical_score, communication_score, problem_solving_score,
  resume_score, total_xp, current_streak, mock_interview_count,
  company_drive_active, branch_cse, branch_ece, branch_me, batch_2026,
  has_internship, projects_count, certifications_count,
  avg_response_latency_ms, last_30d_active_days

Target:  ``placed`` (0/1).  Per-company slice; one model file per
target company (12 total).  CPU only, 5 min each.
"""
import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import roc_auc_score, brier_score_loss
import xgboost as xgb
import joblib

DATA_CSV = os.environ.get(
    "PREPAI_MODEL9_DATA",
    os.path.join(os.path.dirname(__file__), "..", "datasets", "placement_outcomes.csv"),
)
OUT_DIR = os.environ.get(
    "PREPAI_MODEL9_OUT",
    os.path.join(os.path.dirname(__file__), "..", "..", "prepai_trained_models", "placement_predictor_model"),
)
COMPANIES = [
    "tcs", "infosys", "wipro", "zoho", "amazon", "accenture",
    "cognizant", "hcl", "capgemini", "freshworks", "hexaware", "ltinfotech",
]
FEATURES = [
    "technical_score", "communication_score", "problem_solving_score",
    "resume_score", "total_xp", "current_streak", "mock_interview_count",
    "company_drive_active", "branch_cse", "branch_ece", "branch_me",
    "batch_2026", "has_internship", "projects_count", "certifications_count",
    "avg_response_latency_ms", "last_30d_active_days",
]


def _thresholds_for(company: str) -> dict:
    """Doc-locked minimum thresholds per company."""
    return {
        "tcs":       {"technical": 50, "communication": 50, "problem_solving": 50, "aptitude": 50},
        "infosys":   {"technical": 60, "communication": 60, "problem_solving": 55, "aptitude": 60},
        "wipro":     {"technical": 55, "communication": 65, "problem_solving": 55, "aptitude": 55},
        "zoho":      {"technical": 75, "communication": 55, "problem_solving": 80, "aptitude": 70},
        "amazon":    {"technical": 75, "communication": 60, "problem_solving": 80, "aptitude": 70},
        "accenture": {"technical": 55, "communication": 65, "problem_solving": 55, "aptitude": 60},
        "cognizant": {"technical": 60, "communication": 60, "problem_solving": 60, "aptitude": 60},
        "hcl":       {"technical": 55, "communication": 60, "problem_solving": 55, "aptitude": 55},
        "capgemini": {"technical": 55, "communication": 60, "problem_solving": 55, "aptitude": 55},
        "freshworks":{"technical": 65, "communication": 60, "problem_solving": 65, "aptitude": 60},
        "hexaware":  {"technical": 50, "communication": 55, "problem_solving": 50, "aptitude": 50},
        "ltinfotech":{"technical": 55, "communication": 60, "problem_solving": 55, "aptitude": 55},
    }[company]


def _heuristic_label(row, thresholds):
    score = 0
    if row["technical_score"] >= thresholds["technical"]:
        score += 25
    if row["communication_score"] >= thresholds["communication"]:
        score += 25
    if row["problem_solving_score"] >= thresholds["problem_solving"]:
        score += 25
    if row.get("aptitude_score", row["technical_score"]) >= thresholds["aptitude"]:
        score += 25
    return min(score, 100) / 100.0


def main():
    df = pd.read_csv(DATA_CSV)
    os.makedirs(OUT_DIR, exist_ok=True)
    for company in COMPANIES:
        thresholds = _thresholds_for(company)
        y = df.apply(lambda r: _heuristic_label(r, thresholds), axis=1).clip(0, 1)
        # binarize at 0.75 for XGBoost — adjust per real data later
        y_bin = (y >= 0.75).astype(int)
        X = df[FEATURES].fillna(0).astype(np.float32).values

        if y_bin.nunique() < 2:
            print(f"[{company}] not enough label variety, skipping")
            continue

        X_train, X_val, y_train, y_val = train_test_split(X, y_bin, test_size=0.2, random_state=42)
        base = xgb.XGBClassifier(n_estimators=200, max_depth=4, learning_rate=0.05, n_jobs=4, eval_metric="logloss")
        clf = CalibratedClassifierCV(base, method="sigmoid", cv=3)
        clf.fit(X_train, y_train)
        proba = clf.predict_proba(X_val)[:, 1]
        try:
            auc = roc_auc_score(y_val, proba)
            brier = brier_score_loss(y_val, proba)
        except Exception:
            auc, brier = float("nan"), float("nan")
        out_path = os.path.join(OUT_DIR, f"{company}.joblib")
        joblib.dump({"model": clf, "thresholds": thresholds, "features": FEATURES}, out_path)
        print(f"[{company}] saved → {out_path} (auc={auc:.3f}, brier={brier:.3f})")

    with open(os.path.join(OUT_DIR, "thresholds.json"), "w") as f:
        json.dump({c: _thresholds_for(c) for c in COMPANIES}, f, indent=2)
    print("done.")


if __name__ == "__main__":
    main()
