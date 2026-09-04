"""
Google Colab Training Script: Model 2 - Interview Question Generator (GPT-2)
Upload this script to Google Colab, or run its contents in a Jupyter cell.
Ensure you have set the Colab runtime to GPU (T4 or V100).
"""

# Install required libraries
# !pip install transformers datasets torch

import torch
from transformers import GPT2Tokenizer, GPT2LMHeadModel, Trainer, TrainingArguments, DataCollatorForLanguageModeling
from datasets import Dataset

print("GPU Available:", torch.cuda.is_available())

# 1. Prepare Dummy/Synthetic Dataset (Replace with your actual interview transcript lines)
# Format: [ROLE] role_name [TOPIC] topic_name [ANSWER] previous_answer [Q_SCORE] score [NEXT_Q] generated_question
texts = [
    "[ROLE] Software Engineer [TOPIC] OOP [ANSWER] None [Q_SCORE] None [NEXT_Q] Explain the four pillars of OOP.",
    "[ROLE] Software Engineer [TOPIC] OOP [ANSWER] It is inheritance and polymorphism [Q_SCORE] 1 [NEXT_Q] Can you elaborate on Encapsulation and Abstraction?",
    "[ROLE] Data Analyst [TOPIC] SQL [ANSWER] I use select star to get data [Q_SCORE] 1 [NEXT_Q] How would you optimize a slow running query?",
    "[ROLE] Data Analyst [TOPIC] SQL [ANSWER] I use indexes and explain plan to optimize [Q_SCORE] 3 [NEXT_Q] Excellent. Now tell me the difference between a clustered and non-clustered index."
] * 250

dataset = Dataset.from_dict({"text": texts})

# 2. Load Tokenizer & Model
model_name = "gpt2"
tokenizer = GPT2Tokenizer.from_pretrained(model_name)
# GPT-2 has no padding token by default
tokenizer.pad_token = tokenizer.eos_token

model = GPT2LMHeadModel.from_pretrained(model_name)

# 3. Tokenize Dataset
def tokenize_function(examples):
    # Truncation and padding
    tokenized = tokenizer(examples["text"], truncation=True, max_length=128, padding="max_length")
    tokenized["labels"] = tokenized["input_ids"].copy()
    return tokenized

tokenized_datasets = dataset.map(tokenize_function, batched=True, remove_columns=["text"])

# Split into train/val
split_datasets = tokenized_datasets.train_test_split(test_size=0.1, seed=42)
train_dataset = split_datasets["train"]
val_dataset = split_datasets["test"]

data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

# 4. Training Arguments
training_args = TrainingArguments(
    output_dir="./results_gpt2_question_gen",
    num_train_epochs=4,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    eval_steps=100,
    save_steps=100,
    warmup_steps=50,
    learning_rate=5e-5,
    eval_strategy="steps",
    logging_dir="./logs_gpt2",
)

# 5. Train
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    data_collator=data_collator,
)

print("Starting Training...")
trainer.train()

# 6. Save Model for FastAPI Download
print("Saving Model...")
model.save_pretrained("./question_generator_model")
tokenizer.save_pretrained("./question_generator_model")

print("Training Complete! Download the 'question_generator_model' folder and put it in your backend prepai_trained_models directory.")
