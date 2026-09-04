"""Model 1 — Answer Quality Classifier (BERT-base, 4 classes).

Trains a 4-class classifier (Poor / Average / Good / Excellent) on
custom Q&A pairs. Trained on Google Colab (T4 GPU, ~3 hours). The
trained checkpoint is saved to ``../datasets/answer_classifier/`` and
then moved to ``../../prepai_trained_models/answer_quality_model/`` for
the FastAPI ModelManager to load.

Dataset format (CSV):  columns ``question``, ``answer``, ``label`` (0..3).
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
    "PREPAI_MODEL1_DATA",
    os.path.join(os.path.dirname(__file__), "..", "datasets", "answer_classifier.csv"),
)
OUT_DIR = os.environ.get(
    "PREPAI_MODEL1_OUT",
    os.path.join(os.path.dirname(__file__), "..", "..", "prepai_trained_models", "answer_quality_model"),
)
MODEL_NAME = "bert-base-uncased"
MAX_LEN = 128
EPOCHS = 3
LR = 2e-5
BATCH = 16


def build_text(row):
    return f"Question: {row['question']} Answer: {row['answer']}"


def main():
    print("GPU available:", torch.cuda.is_available())
    df = pd.read_csv(DATA_CSV)
    assert {"question", "answer", "label"}.issubset(df.columns), "CSV must have question, answer, label"
    df["text"] = df.apply(build_text, axis=1)
    train_df, val_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df["label"])

    tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)

    def tokenize(batch):
        return tokenizer(batch["text"], padding="max_length", truncation=True, max_length=MAX_LEN)

    train_ds = Dataset.from_pandas(train_df).map(tokenize, batched=True)
    val_ds = Dataset.from_pandas(val_df).map(tokenize, batched=True)
    cols = ["input_ids", "attention_mask", "label"]
    train_ds.set_format(type="torch", columns=cols)
    val_ds.set_format(type="torch", columns=cols)

    model = BertForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=4)

    args = TrainingArguments(
        output_dir=os.path.join(OUT_DIR, "_runs"),
        num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH,
        per_device_eval_batch_size=BATCH,
        warmup_steps=100,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=LR,
        load_best_model_at_end=True,
        logging_steps=50,
        report_to=[],
    )

    def metrics(eval_pred):
        labels = eval_pred.label_ids
        preds = eval_pred.predictions.argmax(-1)
        precision, recall, f1, _ = precision_recall_fscore_support(labels, preds, average="weighted")
        return {"accuracy": accuracy_score(labels, preds), "f1": f1, "precision": precision, "recall": recall}

    trainer = Trainer(model=model, args=args, train_dataset=train_ds, eval_dataset=val_ds, compute_metrics=metrics)
    trainer.train()
    os.makedirs(OUT_DIR, exist_ok=True)
    trainer.save_model(OUT_DIR)
    tokenizer.save_pretrained(OUT_DIR)
    print(f"Saved Model 1 to {OUT_DIR}")


if __name__ == "__main__":
    main()
