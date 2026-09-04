"""Model 3 — Semantic Answer Relevance (Sentence-BERT fine-tune).

Fine-tunes ``all-MiniLM-L6-v2`` on the SNLI entailment dataset so that
the model maps answers and questions into a single shared embedding
space. Cosine similarity at inference time gives a relevance score
0..1.

Dataset:  HuggingFace ``stanfordnlp/snli`` (570k pairs).  We treat
``entailment`` as the positive label and ``contradiction`` as the
negative.
"""
import os
from datasets import load_dataset
from sentence_transformers import SentenceTransformer, InputExample, losses
from sentence_transformers.evaluation import EmbeddingSimilarityEvaluator
from torch.utils.data import DataLoader

OUT_DIR = os.environ.get(
    "PREPAI_MODEL3_OUT",
    os.path.join(os.path.dirname(__file__), "..", "..", "prepai_trained_models", "semantic_relevance_model"),
)
BASE_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EPOCHS = 1
BATCH = 64


def main():
    snli = load_dataset("snli", split="train")
    # label 0 = entailment, 1 = neutral, 2 = contradiction
    snli = snli.filter(lambda r: r["label"] != 1)
    snli = snli.shuffle(seed=42).select(range(min(20000, len(snli))))

    train_examples = [
        InputExample(texts=[r["premise"], r["hypothesis"]], label=float(r["label"]))
        for r in snli
    ]
    loader = DataLoader(train_examples, shuffle=True, batch_size=BATCH)

    model = SentenceTransformer(BASE_MODEL)
    train_loss = losses.SoftmaxLoss(
        model=model,
        sentence_embedding_dimension=model.get_sentence_embedding_dimension(),
        num_labels=2,
    )

    model.fit(
        train_objectives=[(loader, train_loss)],
        epochs=EPOCHS,
        warmup_steps=200,
        output_path=OUT_DIR,
        show_progress_bar=True,
    )
    print(f"Saved Model 3 to {OUT_DIR}")


if __name__ == "__main__":
    main()
