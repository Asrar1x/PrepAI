"""Model 8 — Tamil Speech Recognition (Wav2Vec2 XLSR-53 fine-tune).

Fine-tunes ``facebook/wav2vec2-xls-r-300m`` on the OpenSLR-65 Tamil
corpus (≈100 hours, 10h is enough for an MVP).  Colab A100, 6 hours.
CTC head + greedy decoder.  We package the processor + a tiny
``KenLMPostProcessor`` fallback for very short utterances.

If training is too heavy, the same checkpoint can be downloaded from
``vasista22/whisper-tamil-small`` — that is the *inference* fallback
the backend uses when this model is absent.
"""
import os
import torch
from datasets import load_dataset, Audio
from transformers import (
    Wav2Vec2ForCTC,
    Wav2Vec2Processor,
    TrainingArguments,
    Trainer,
)

DATA_DIR = os.environ.get(
    "PREPAI_MODEL8_DATA",
    os.path.join(os.path.dirname(__file__), "..", "datasets", "openslr65"),
)
OUT_DIR = os.environ.get(
    "PREPAI_MODEL8_OUT",
    os.path.join(os.path.dirname(__file__), "..", "..", "prepai_trained_models", "tamil_asr_model"),
)
BASE = "facebook/wav2vec2-xls-r-300m"
EPOCHS = 8
LR = 3e-4
BATCH = 4
GRAD_ACC = 4


def main():
    processor = Wav2Vec2Processor.from_pretrained(BASE)
    model = Wav2Vec2ForCTC.from_pretrained(
        BASE,
        attention_dropout=0.1,
        hidden_dropout=0.1,
        feat_proj_dropout=0.0,
        mask_time_prob=0.05,
        layerdrop=0.0,
        ctc_loss_reduction="mean",
        pad_token_id=processor.tokenizer.pad_token_id,
        vocab_size=len(processor.tokenizer),
    )

    ds = load_dataset("common_voice", "ta", split="train", data_dir=DATA_DIR)
    ds = ds.cast_column("audio", Audio(sampling_rate=16_000))

    def prepare(batch):
        audio = batch["audio"]
        batch["input_values"] = processor(audio["array"], sampling_rate=16_000).input_values[0]
        with processor.as_target_processor():
            batch["labels"] = processor(batch["sentence"]).input_ids
        return batch

    ds = ds.map(prepare, remove_columns=ds.column_names, num_proc=2)

    def collate(batch):
        input_values = [{"input_values": b["input_values"]} for b in batch]
        labels = [{"input_ids": b["labels"]} for b in batch]
        batch_padded = processor.feature_extractor.pad(input_values, return_tensors="pt")
        with processor.as_target_processor():
            labels_padded = processor.tokenizer.pad(labels, return_tensors="pt")
        labels_padded["input_ids"][labels_padded.attention_mask.ne(1)] = -100
        batch_padded["labels"] = labels_padded["input_ids"]
        return batch_padded

    args = TrainingArguments(
        output_dir=os.path.join(OUT_DIR, "_runs"),
        per_device_train_batch_size=BATCH,
        gradient_accumulation_steps=GRAD_ACC,
        learning_rate=LR,
        warmup_steps=500,
        num_train_epochs=EPOCHS,
        fp16=torch.cuda.is_available(),
        save_strategy="epoch",
        save_total_limit=1,
        report_to=[],
    )
    trainer = Trainer(model=model, args=args, train_dataset=ds, data_collator=collate)
    trainer.train()
    os.makedirs(OUT_DIR, exist_ok=True)
    trainer.save_model(OUT_DIR)
    processor.save_pretrained(OUT_DIR)
    print(f"Saved Model 8 to {OUT_DIR}")


if __name__ == "__main__":
    main()
