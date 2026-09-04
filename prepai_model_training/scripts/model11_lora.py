"""Model 11 — Company-Specific LoRA Adapters (12 adapters).

Lightweight LoRA fine-tuning on top of Model 1 (BERT) + Model 2 (GPT-2).
Each adapter is ≈5 MB, trains in 30 minutes on Colab T4, and replaces
the base model's behaviour for one company.  At inference the backend
loads the base once and swaps adapters as the company target changes.

Set ``COMPANY=tcs`` (or any of 12) before invoking.  Per-company CSVs
live in ``data/company_specific/{slug}_qa.csv`` and
``data/company_specific/{slug}_interview.txt`` for the BERT and GPT-2
adapters respectively.
"""
import os
import sys
import pandas as pd
from datasets import Dataset
from transformers import (
    BertTokenizer,
    BertForSequenceClassification,
    GPT2Tokenizer,
    GPT2LMHeadModel,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)
from peft import LoraConfig, get_peft_model, TaskType

COMPANY = os.environ.get("COMPANY", "tcs")
BASE_BERT = os.environ.get(
    "PREPAI_MODEL1_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "prepai_trained_models", "answer_quality_model"),
)
BASE_GPT2 = os.environ.get(
    "PREPAI_MODEL2_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "prepai_trained_models", "question_generator_model"),
)
DATA_CSV = os.path.join(os.path.dirname(__file__), "..", "datasets", "company_specific", f"{COMPANY}_qa.csv")
DATA_TXT = os.path.join(os.path.dirname(__file__), "..", "datasets", "company_specific", f"{COMPANY}_interview.txt")
OUT_BERT = os.path.join(
    os.path.dirname(__file__), "..", "..", "prepai_trained_models", "lora_adapters", COMPANY
)


def train_bert():
    print(f"[LoRA-BERT] training for {COMPANY}")
    df = pd.read_csv(DATA_CSV)
    tokenizer = BertTokenizer.from_pretrained(BASE_BERT)

    def tok(batch):
        return tokenizer(
            f"Question: {batch['question']} Answer: {batch['answer']}",
            padding="max_length", truncation=True, max_length=96,
        )

    ds = Dataset.from_pandas(df).map(tok, batched=True)
    ds.set_format(type="torch", columns=["input_ids", "attention_mask", "label"])
    model = BertForSequenceClassification.from_pretrained(BASE_BERT, num_labels=4)
    cfg = LoraConfig(
        task_type=TaskType.SEQ_CLS,
        r=16, lora_alpha=32, lora_dropout=0.1,
        target_modules=["query", "value"], bias="none",
    )
    peft = get_peft_model(model, cfg)
    peft.print_trainable_parameters()
    args = TrainingArguments(
        output_dir=os.path.join(OUT_BERT, "_runs_bert"),
        num_train_epochs=3,
        per_device_train_batch_size=16,
        learning_rate=1e-5,
        eval_strategy="no",
        save_strategy="no",
        report_to=[],
    )
    Trainer(model=peft, args=args, train_dataset=ds).train()
    os.makedirs(OUT_BERT, exist_ok=True)
    peft.save_pretrained(OUT_BERT)
    print(f"[LoRA-BERT] saved → {OUT_BERT}")


def train_gpt2():
    print(f"[LoRA-GPT2] training for {COMPANY}")
    from datasets import load_dataset
    out_gpt2 = os.path.join(OUT_BERT, f"gpt2_{COMPANY}")
    tokenizer = GPT2Tokenizer.from_pretrained(BASE_GPT2)
    tokenizer.pad_token = tokenizer.eos_token
    ds = load_dataset("text", data_files=DATA_TXT, split="train")

    def tok(batch):
        return tokenizer(batch["text"], truncation=True, padding="max_length", max_length=192)

    ds = ds.map(tok, batched=True, remove_columns=["text"])
    ds.set_format(type="torch", columns=["input_ids", "attention_mask"])
    model = GPT2LMHeadModel.from_pretrained(BASE_GPT2)
    cfg = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=8, lora_alpha=16, lora_dropout=0.05,
        target_modules=["c_attn"], bias="none",
    )
    peft = get_peft_model(model, cfg)
    peft.print_trainable_parameters()
    args = TrainingArguments(
        output_dir=os.path.join(out_gpt2, "_runs"),
        num_train_epochs=2,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=1e-4,
        save_strategy="no",
        report_to=[],
    )
    Trainer(
        model=peft, args=args, train_dataset=ds,
        data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
    ).train()
    os.makedirs(out_gpt2, exist_ok=True)
    peft.save_pretrained(out_gpt2)
    print(f"[LoRA-GPT2] saved → {out_gpt2}")


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "both"
    if which in ("bert", "both"):
        train_bert()
    if which in ("gpt2", "both"):
        train_gpt2()
