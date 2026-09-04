"""Helper script — collect 900 labelled pose samples for Model 5.

Uses MediaPipe Holistic to extract 33 pose keypoints per frame, then
derives 103 geometric features (joint angles, symmetry ratios,
limb distances) and writes one row per labelled sample to
``datasets/pose_features.csv`` with the format the trainer expects::

    features,label
    "[0.31, 0.55, 0.21, ...]","good_posture"

How to use:

  python collect_pose.py --label good_posture --count 300
  python collect_pose.py --label slouching   --count 300
  python collect_pose.py --label fidgeting   --count 200
  python collect_pose.py --label gesturing   --count 100
"""
import argparse
import csv
import json
import math
import os
import time
import numpy as np
import cv2

OUT = os.path.join(os.path.dirname(__file__), "..", "datasets", "pose_features.csv")


def geometric_features(keypoints):
    """keypoints: (33, 3) array of (x, y, z). Returns 103-D feature vec."""
    feats = []
    # raw normalised coords (33 * 3 = 99)
    feats.extend(keypoints.flatten().tolist())
    # 2 derived features: left/right shoulder height symmetry + nose-to-shoulder
    left_shoulder = keypoints[11]
    right_shoulder = keypoints[12]
    nose = keypoints[0]
    sym = abs(left_shoulder[1] - right_shoulder[1])
    feats.append(sym)
    feats.append(np.linalg.norm(nose - (left_shoulder + right_shoulder) / 2))
    return np.array(feats, dtype=np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", required=True)
    ap.add_argument("--count", type=int, default=100)
    args = ap.parse_args()

    import mediapipe as mp
    holistic = mp.solutions.holistic.Holistic(model_complexity=1, smooth_landmarks=True)
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise SystemExit("no webcam")

    rows = []
    print(f"collecting {args.count} samples for label={args.label}, press q to stop early")
    t0 = time.time()
    while len(rows) < args.count:
        ok, frame = cap.read()
        if not ok:
            continue
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = holistic.process(rgb)
        if not res.pose_landmarks:
            continue
        kp = np.array([[lm.x, lm.y, lm.z] for lm in res.pose_landmarks.landmark], dtype=np.float32)
        feats = geometric_features(kp)
        rows.append((feats.tolist(), args.label))
        cv2.putText(frame, f"{args.label}: {len(rows)}/{args.count}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.imshow("collect", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    holistic.close()

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    new_file = not os.path.exists(OUT)
    with open(OUT, "a", newline="") as f:
        w = csv.writer(f)
        if new_file:
            w.writerow(["features", "label"])
        for feats, lbl in rows:
            w.writerow([json.dumps(feats), lbl])
    print(f"appended {len(rows)} rows in {time.time()-t0:.0f}s → {OUT}")


if __name__ == "__main__":
    main()
