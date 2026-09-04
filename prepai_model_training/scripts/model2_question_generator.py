"""Model 2 — Interview / Aptitude Question Generator (GPT-2 fine-tune).

Trains a GPT-2 small model on tagged question→answer→next-question
transcripts. The same checkpoint powers the aptitude-question service
(prompt template swapped at inference time).

Dataset format (train.txt)::

    [ROLE] backend [TOPIC] databases [PREV_Q] What is a JOIN? [ANSWER] ...
    [QUALITY] good [NEXT_Q] Can you walk me through an INNER vs OUTER JOIN?

"""
import os
from datasets import load_dataset
from transformers import (
    GPT2Tokenizer,
    GPT2LMHeadModel,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)

DATA_FILE = os.environ.get(
    "PREPAI_MODEL2_DATA",
    os.path.join(os.path.dirname(__file__), "..", "datasets", "question_generator.txt"),
)
OUT_DIR = os.environ.get(
    "PREPAI_MODEL2_OUT",
    os.path.join(os.path.dirname(__file__), "..", "..", "prepai_trained_models", "question_generator_model"),
)
MODEL_NAME = "gpt2"
MAX_LEN = 256
EPOCHS = 5
LR = 5e-5
BATCH = 4
GRAD_ACC = 4


def main():
    tokenizer = GPT2Tokenizer.from_pretrained(MODEL_NAME)
    tokenizer.pad_token = tokenizer.eos_token

    ds = load_dataset("text", data_files=DATA_FILE, split="train")

    def tokenize(batch):
        return tokenizer(batch["text"], truncation=True, padding="max_length", max_length=MAX_LEN)

    ds = ds.map(tokenize, batched=True, remove_columns=["text"])
    ds.set_format(type="torch", columns=["input_ids", "attention_mask"])

    collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)
    model = GPT2LMHeadModel.from_pretrained(MODEL_NAME)
    model.resize_token_embeddings(len(tokenizer))

    args = TrainingArguments(
        output_dir=os.path.join(OUT_DIR, "_runs"),
        num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH,
        gradient_accumulation_steps=GRAD_ACC,
        learning_rate=LR,
        warmup_steps=200,
        weight_decay=0.01,
        logging_steps=50,
        save_strategy="epoch",
        save_total_limit=1,
        report_to=[],
    )
    trainer = Trainer(model=model, args=args, train_dataset=ds, data_collator=collator)
    trainer.train()
    import os as _os
    _os.makedirs(OUT_DIR, exist_ok=True)
    trainer.save_model(OUT_DIR)
    tokenizer.save_pretrained(OUT_DIR)
    print(f"Saved Model 2 to {OUT_DIR}")


if __name__ == "__main__":
    main()
