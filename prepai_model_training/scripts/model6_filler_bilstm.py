"""Model 6 — Filler Word & Speech Rate Detector (BiLSTM on GloVe).

Two-tower BiLSTM over tokenised transcript windows.  Tower A tags
each token as ``FILLER`` (``um``, ``uh``, ``like``, ``you know`` …)
or ``O``.  Tower B regresses words-per-minute (speech rate) for the
window.  Trained on Common-Voice transcript snippets; 1000 labelled
windows.  Colab T4, 2 hours.

Dataset CSV columns:  ``tokens`` (JSON list of lowercase strings) +
``tags`` (JSON list of ``FILLER`` / ``O``) + ``wpm`` (float).
"""
import os
import json
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split

DATA_CSV = os.environ.get(
    "PREPAI_MODEL6_DATA",
    os.path.join(os.path.dirname(__file__), "..", "datasets", "filler_windows.csv"),
)
GLOVE_TXT = os.environ.get(
    "PREPAI_GLOVE",
    os.path.join(os.path.dirname(__file__), "..", "datasets", "glove.6B.100d.txt"),
)
OUT_DIR = os.environ.get(
    "PREPAI_MODEL6_OUT",
    os.path.join(os.path.dirname(__file__), "..", "..", "prepai_trained_models", "speech_pattern_model"),
)
EMB_DIM = 100
HIDDEN = 64
MAX_LEN = 60
EPOCHS = 30
LR = 1e-3
BATCH = 32

PAD = "<pad>"
UNK = "<unk>"
TAG2ID = {"O": 0, "FILLER": 1}


def load_glove(path):
    vocab = {PAD: 0, UNK: 1}
    vecs = [np.zeros(EMB_DIM), np.random.normal(scale=0.6, size=(EMB_DIM,)).astype(np.float32)]
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip().split(" ")
            if len(parts) != EMB_DIM + 1:
                continue
            word = parts[0]
            if word not in vocab:
                vocab[word] = len(vocab)
                vecs.append(np.asarray(parts[1:], dtype=np.float32))
    return vocab, np.stack(vecs)


class FillerDataset(Dataset):
    def __init__(self, df, vocab):
        self.vocab = vocab
        self.records = []
        for _, row in df.iterrows():
            tokens = json.loads(row["tokens"])
            tags = json.loads(row["tags"])
            ids = [vocab.get(t.lower(), vocab[UNK]) for t in tokens][:MAX_LEN]
            tag_ids = [TAG2ID[t] for t in tags][:MAX_LEN]
            self.records.append((ids, tag_ids, float(row["wpm"])))

    def __len__(self):
        return len(self.records)

    def __getitem__(self, idx):
        return self.records[idx]


def collate(batch):
    ids, tags, wpms = zip(*batch)
    L = max(len(x) for x in ids)
    x = torch.zeros(len(batch), L, dtype=torch.long)
    y_tag = torch.zeros(len(batch), L, dtype=torch.long)
    mask = torch.zeros(len(batch), L, dtype=torch.bool)
    for i, (a, b) in enumerate(zip(ids, tags)):
        x[i, : len(a)] = torch.tensor(a)
        y_tag[i, : len(b)] = torch.tensor(b)
        mask[i, : len(a)] = True
    return x, y_tag, mask, torch.tensor(wpms, dtype=torch.float32)


class BiLSTMTagger(nn.Module):
    def __init__(self, emb_matrix, n_tags=2):
        super().__init__()
        self.emb = nn.Embedding.from_pretrained(torch.tensor(emb_matrix), freeze=False, padding_idx=0)
        self.lstm = nn.LSTM(EMB_DIM, HIDDEN, bidirectional=True, batch_first=True)
        self.tag_head = nn.Linear(HIDDEN * 2, n_tags)
        self.wpm_head = nn.Linear(HIDDEN * 2, 1)

    def forward(self, x):
        e = self.emb(x)
        h, _ = self.lstm(e)
        tag_logits = self.tag_head(h)
        wpm = self.wpm_head(h.mean(dim=1)).squeeze(-1)
        return tag_logits, wpm


def main():
    vocab, emb_matrix = load_glove(GLOVE_TXT)
    print(f"loaded GloVe vocab={len(vocab)}")
    df = pd.read_csv(DATA_CSV)
    train_df, val_df = train_test_split(df, test_size=0.2, random_state=42)

    train_loader = DataLoader(FillerDataset(train_df, vocab), batch_size=BATCH, shuffle=True, collate_fn=collate)
    val_loader = DataLoader(FillerDataset(val_df, vocab), batch_size=BATCH, shuffle=False, collate_fn=collate)

    model = BiLSTMTagger(emb_matrix)
    opt = optim.Adam(model.parameters(), lr=LR)
    tag_loss = nn.CrossEntropyLoss(ignore_index=-100)
    reg_loss = nn.MSELoss()

    for epoch in range(EPOCHS):
        model.train()
        running = 0.0
        for x, y_tag, mask, wpm in train_loader:
            opt.zero_grad()
            tag_logits, wpm_pred = model(x)
            tloss = tag_loss(tag_logits.view(-1, 2), y_tag.view(-1))
            rloss = reg_loss(wpm_pred, wpm)
            loss = tloss + 0.1 * rloss
            loss.backward()
            opt.step()
            running += loss.item()
        if (epoch + 1) % 5 == 0:
            print(f"epoch {epoch+1}/{EPOCHS} loss={running/len(train_loader):.4f}")

    os.makedirs(OUT_DIR, exist_ok=True)
    torch.save(
        {"state_dict": model.state_dict(), "vocab": vocab, "emb_dim": EMB_DIM, "hidden": HIDDEN, "max_len": MAX_LEN},
        os.path.join(OUT_DIR, "bilstm.pt"),
    )
    print(f"Saved Model 6 to {OUT_DIR}")


if __name__ == "__main__":
    main()
