"""Model 7 — Group Discussion Contribution Analyser (BERT 5-class).

Sequential fine-tune from Model 1's BERT.  Five classes:
``initiator``, ``facilitator``, ``information_giver``, ``opinion_seeker``,
``silent_observer``.  Trained on 100 manually written GD transcripts
(≈5000 student turns, 50 turns/GD × 100 GDs).

Dataset CSV columns: ``turn_text`` (string) + ``label`` (0..4).
"""
import os
import pandas as pd
import torch
from datasets import Dataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from transformers import (
    BertTokenizer,
    BertForSequenceClassification,
    Trainer,
    TrainingArguments,
)

DATA_CSV = os.environ.get(
    "PREPAI_MODEL7_DATA",
    os.path.join(os.path.dirname(__file__), "..", "datasets", "gd_turns.csv"),
)
OUT_DIR = os.environ.get(
    "PREPAI_MODEL7_OUT",
    os.path.join(os.path.dirname(__file__), "..", "..", "prepai_trained_models", "gd_evaluator_model"),
)
BASE = os.environ.get(
    "PREPAI_MODEL1_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "prepai_trained_models", "answer_quality_model"),
)
EPOCHS = 4
LR = 2e-5
BATCH = 16
MAX_LEN = 96
NUM_LABELS = 5


def main():
    df = pd.read_csv(DATA_CSV)
    train_df, val_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df["label"])

    tokenizer = BertTokenizer.from_pretrained(BASE)

    def tokenize(batch):
        return tokenizer(batch["turn_text"], padding="max_length", truncation=True, max_length=MAX_LEN)

    train_ds = Dataset.from_pandas(train_df).map(tokenize, batched=True)
    val_ds = Dataset.from_pandas(val_df).map(tokenize, batched=True)
    cols = ["input_ids", "attention_mask", "label"]
    train_ds.set_format(type="torch", columns=cols)
    val_ds.set_format(type="torch", columns=cols)

    # sequential fine-tune from Model 1
    model = BertForSequenceClassification.from_pretrained(BASE, num_labels=NUM_LABELS, ignore_mismatched_sizes=True)

    args = TrainingArguments(
        output_dir=os.path.join(OUT_DIR, "_runs"),
        num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH,
        per_device_eval_batch_size=BATCH,
        learning_rate=LR,
        warmup_steps=50,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        report_to=[],
    )

    def metrics(eval_pred):
        labels = eval_pred.label_ids
        preds = eval_pred.predictions.argmax(-1)
        p, r, f1, _ = precision_recall_fscore_support(labels, preds, average="weighted", zero_division=0)
        return {"accuracy": accuracy_score(labels, preds), "f1": f1, "precision": p, "recall": r}

    trainer = Trainer(model=model, args=args, train_dataset=train_ds, eval_dataset=val_ds, compute_metrics=metrics)
    trainer.train()
    os.makedirs(OUT_DIR, exist_ok=True)
    trainer.save_model(OUT_DIR)
    tokenizer.save_pretrained(OUT_DIR)
    print(f"Saved Model 7 to {OUT_DIR}")


if __name__ == "__main__":
    main()
