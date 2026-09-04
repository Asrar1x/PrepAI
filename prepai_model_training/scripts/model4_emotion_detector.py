"""Model 4 — Emotion & Stress Detector (ResNet-18 on FER2013).

Fine-tunes a torchvision ResNet-18 on the FER2013 7-emotion dataset:
angry, disgust, fear, happy, neutral, sad, surprise.  Trained on
Colab T4 (4 hours, 50 epochs).  Used by the live interview WebSocket
to flag a rising stress signal across the session.

Dataset layout::

    fer2013/
      train/
        angry/  disgust/  fear/  happy/  neutral/  sad/  surprise/
      test/  (same)

Download: ``kaggle datasets download msambare/fer2013`` and unzip.
"""
import os
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader

DATA_DIR = os.environ.get(
    "PREPAI_MODEL4_DATA",
    os.path.join(os.path.dirname(__file__), "..", "datasets", "fer2013"),
)
OUT_DIR = os.environ.get(
    "PREPAI_MODEL4_OUT",
    os.path.join(os.path.dirname(__file__), "..", "..", "prepai_trained_models", "emotion_detector_model"),
)
EPOCHS = 50
BATCH = 64
LR = 1e-4
NUM_CLASSES = 7
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

TRAIN_TF = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize((48, 48)),
    transforms.RandomHorizontalFlip(),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])
EVAL_TF = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize((48, 48)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


def main():
    train_ds = datasets.ImageFolder(os.path.join(DATA_DIR, "train"), transform=TRAIN_TF)
    test_ds = datasets.ImageFolder(os.path.join(DATA_DIR, "test"), transform=EVAL_TF)
    print(f"train={len(train_ds)} test={len(test_ds)} classes={train_ds.classes}")

    train_loader = DataLoader(train_ds, batch_size=BATCH, shuffle=True, num_workers=2)
    test_loader = DataLoader(test_ds, batch_size=BATCH, shuffle=False, num_workers=2)

    model = models.resnet18(weights="IMAGENET1K_V1")
    model.fc = nn.Linear(model.fc.in_features, NUM_CLASSES)
    model = model.to(DEVICE)
    opt = optim.Adam(model.parameters(), lr=LR)
    crit = nn.CrossEntropyLoss()

    for epoch in range(EPOCHS):
        model.train()
        running = 0.0
        for i, (x, y) in enumerate(train_loader):
            x, y = x.to(DEVICE), y.to(DEVICE)
            opt.zero_grad()
            out = model(x)
            loss = crit(out, y)
            loss.backward()
            opt.step()
            running += loss.item()
        print(f"epoch {epoch+1}/{EPOCHS} train_loss={running/len(train_loader):.4f}")

    # quick test accuracy
    model.eval()
    correct = total = 0
    with torch.no_grad():
        for x, y in test_loader:
            x, y = x.to(DEVICE), y.to(DEVICE)
            preds = model(x).argmax(1)
            correct += (preds == y).sum().item()
            total += y.size(0)
    print(f"test acc {correct/total:.3f}")

    os.makedirs(OUT_DIR, exist_ok=True)
    torch.save(
        {"state_dict": model.state_dict(), "classes": train_ds.classes},
        os.path.join(OUT_DIR, "emotion_resnet18.pt"),
    )
    print(f"Saved Model 4 to {OUT_DIR}")


if __name__ == "__main__":
    main()
