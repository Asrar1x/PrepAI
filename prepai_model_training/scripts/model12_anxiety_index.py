"""Model 12 — Mental Health / Anxiety Index (weighted regression formula).

No neural network.  Pure weighted regression on existing PrepAI
session data — interpretable, auditable, ethically appropriate.  This
script *exports* the formula as a JSON blob the backend loads at
startup.  The runtime lives in
``backend/app/services/anxiety_service.py``.
"""
import json
import os

OUT_FILE = os.environ.get(
    "PREPAI_MODEL12_OUT",
    os.path.join(os.path.dirname(__file__), "..", "..", "prepai_trained_models", "anxiety_index", "weights.json"),
)

# Doc-locked weights (§13 of PrepAI_All_Custom_Models.docx)
WEIGHTS = {
    "filler_word_trend": 0.25,
    "response_latency_trend": 0.25,
    "score_drop": 0.20,
    "session_frequency_drop": 0.20,
    "session_abandon_rate": 0.10,
}

LEVELS = [
    (0.25, "calm",             "You are making steady progress. Keep it up!"),
    (0.50, "mild_concern",     "Slight signs of stress detected. Consider taking short practice breaks."),
    (0.75, "moderate_anxiety", "You seem to be finding placement prep challenging. Focus on one company at a time."),
    (1.01, "high_anxiety",     "High stress signals detected. It is okay to take a day off. Consistent effort matters more than intensity."),
]


def main():
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w") as f:
        json.dump({"weights": WEIGHTS, "levels": LEVELS}, f, indent=2)
    print(f"Saved Model 12 weights → {OUT_FILE}")


if __name__ == "__main__":
    main()
