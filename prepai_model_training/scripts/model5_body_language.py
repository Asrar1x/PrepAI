"""Model 5 — Body Language Classifier (MediaPipe + 3-layer MLP).

Collects 33-pose keypoints via MediaPipe Holistic, computes 103
geometric features (joint angles, distances, symmetry ratios) and
trains a small MLP to score posture: ``good_posture`` vs
``slouching`` vs ``fidgeting`` vs ``gesturing``.  Fast: 10 min CPU
training on 900 self-collected samples.

Dataset CSV columns:  ``features`` (comma-separated 103 floats) +
``label`` (string).
"""
import os
import json
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

DATA_CSV = os.environ.get(
    "PREPAI_MODEL5_DATA",
    os.path.join(os.path.dirname(__file__), "..", "datasets", "pose_features.csv"),
)
OUT_DIR = os.environ.get(
    "PREPAI_MODEL5_OUT",
    os.path.join(os.path.dirname(__file__), "..", "..", "prepai_trained_models", "body_language_model"),
)
FEATURE_DIM = 103
EPOCHS = 40
LR = 1e-3
BATCH = 16


class PostureMLP(nn.Module):
    def __init__(self, in_dim, n_classes):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, n_classes),
        )

    def forward(self, x):
        return self.net(x)


def main():
    df = pd.read_csv(DATA_CSV)
    X = np.array([json.loads(s) for s in df["features"]], dtype=np.float32)
    y_raw = df["label"].astype(str).values
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    assert X.shape[1] == FEATURE_DIM, f"expected {FEATURE_DIM} features, got {X.shape[1]}"

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    X_train = torch.tensor(X_train)
    X_test = torch.tensor(X_test)
    y_train = torch.tensor(y_train, dtype=torch.long)
    y_test = torch.tensor(y_test, dtype=torch.long)

    model = PostureMLP(FEATURE_DIM, len(le.classes_))
    opt = optim.Adam(model.parameters(), lr=LR)
    crit = nn.CrossEntropyLoss()

    for epoch in range(EPOCHS):
        model.train()
        idx = torch.randperm(X_train.size(0))
        losses = []
        for s in range(0, X_train.size(0), BATCH):
            b = idx[s : s + BATCH]
            opt.zero_grad()
            out = model(X_train[b])
            loss = crit(out, y_train[b])
            loss.backward()
            opt.step()
            losses.append(loss.item())
        if (epoch + 1) % 10 == 0:
            print(f"epoch {epoch+1}/{EPOCHS} loss={np.mean(losses):.4f}")

    model.eval()
    with torch.no_grad():
        preds = model(X_test).argmax(1)
        acc = (preds == y_test).float().mean().item()
    print(f"test acc {acc:.3f}")

    os.makedirs(OUT_DIR, exist_ok=True)
    torch.save(
        {"state_dict": model.state_dict(), "classes": list(le.classes_), "feature_dim": FEATURE_DIM},
        os.path.join(OUT_DIR, "posture_mlp.pt"),
    )
    with open(os.path.join(OUT_DIR, "label_encoder.json"), "w") as f:
        json.dump(list(le.classes_), f)
    print(f"Saved Model 5 to {OUT_DIR}")


if __name__ == "__main__":
    main()
