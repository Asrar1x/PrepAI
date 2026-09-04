"""
Google Colab Training Script: Model 1 - Answer Quality Classifier (BERT)
Upload this script to Google Colab, or run its contents in a Jupyter cell.
Ensure you have set the Colab runtime to GPU (T4 or V100).
"""

# Install required libraries
# !pip install transformers datasets torch scikit-learn pandas

import pandas as pd
import torch
from transformers import BertTokenizer, BertForSequenceClassification, Trainer, TrainingArguments
from datasets import Dataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

print("GPU Available:", torch.cuda.is_available())

# 1. Prepare Dummy/Synthetic Dataset (Replace with your actual CSV)
data = {
    "question": [
        "What is OOP?", "Explain polymorphism.", "What is a database?",
        "How does DNS work?", "Explain REST API."
    ] * 200,
    "answer": [
        "It is object oriented programming.", # Poor (0)
        "Polymorphism means many forms, like method overloading.", # Average (1)
        "A database is an organized collection of data, typically stored electronically in a computer system.", # Good (2)
        "DNS resolves domain names to IP addresses by checking the cache, then querying the resolver, root, TLD, and authoritative nameservers sequentially.", # Excellent (3)
        "REST is an API." # Poor (0)
    ] * 200,
    "label": [0, 1, 2, 3, 0] * 200
}

df = pd.DataFrame(data)
df['text'] = "Question: " + df['question'] + " Answer: " + df['answer']

train_df, val_df = train_test_split(df, test_size=0.2, random_state=42)

train_dataset = Dataset.from_pandas(train_df)
val_dataset = Dataset.from_pandas(val_df)

# 2. Load Tokenizer
model_name = "bert-base-uncased"
tokenizer = BertTokenizer.from_pretrained(model_name)

def tokenize_function(examples):
    return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=128)

train_dataset = train_dataset.map(tokenize_function, batched=True)
val_dataset = val_dataset.map(tokenize_function, batched=True)

train_dataset.set_format(type="torch", columns=["input_ids", "attention_mask", "label"])
val_dataset.set_format(type="torch", columns=["input_ids", "attention_mask", "label"])

# 3. Load Model
model = BertForSequenceClassification.from_pretrained(model_name, num_labels=4)

# 4. Define Metrics
def compute_metrics(pred):
    labels = pred.label_ids
    preds = pred.predictions.argmax(-1)
    precision, recall, f1, _ = precision_recall_fscore_support(labels, preds, average="weighted")
    acc = accuracy_score(labels, preds)
    return {"accuracy": acc, "f1": f1, "precision": precision, "recall": recall}

# 5. Training Arguments
training_args = TrainingArguments(
    output_dir="./results_bert_classifier",
    num_train_epochs=3,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    warmup_steps=100,
    weight_decay=0.01,
    logging_dir="./logs",
    eval_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    load_best_model_at_end=True,
)

# 6. Train
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    compute_metrics=compute_metrics,
)

print("Starting Training...")
trainer.train()

# 7. Save Model for FastAPI Download
print("Saving Model...")
model.save_pretrained("./answer_quality_model")
tokenizer.save_pretrained("./answer_quality_model")

print("Training Complete! Download the 'answer_quality_model' folder and put it in your backend prepai_trained_models directory.")
