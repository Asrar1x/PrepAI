"""
Google Colab Training Script: Model 3 - Semantic Answer Relevance (Sentence-BERT)
Upload this script to Google Colab, or run its contents in a Jupyter cell.
Ensure you have set the Colab runtime to GPU (T4 or V100).
"""

# Install required libraries
# !pip install sentence-transformers pandas

import pandas as pd
import torch
from sentence_transformers import SentenceTransformer, InputExample, losses
from torch.utils.data import DataLoader

print("GPU Available:", torch.cuda.is_available())

# 1. Prepare Dummy/Synthetic Dataset
# Format: question, answer, relevance_score (0.0 to 1.0)
data = {
    "question": [
        "What is OOP?", "What is OOP?", "What is OOP?", 
        "Explain polymorphism.", "Explain polymorphism.",
        "What is a database?", "What is a database?"
    ] * 150,
    "answer": [
        "Object-oriented programming is a paradigm based on objects.", # High
        "It is a way to write code.", # Medium
        "I like eating pizza.", # Low
        "Polymorphism allows objects of different types to be treated as instances of the same class.", # High
        "It means poly and morph.", # Low
        "A structured set of data held in a computer.", # High
        "A place to store things like clothes.", # Low
    ] * 150,
    "score": [1.0, 0.5, 0.0, 1.0, 0.1, 0.9, 0.0] * 150
}

df = pd.DataFrame(data)

# Convert to Sentence-Transformers InputExample format
train_examples = []
for _, row in df.iterrows():
    train_examples.append(InputExample(texts=[row['question'], row['answer']], label=float(row['score'])))

# DataLoader
train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=16)

# 2. Load Pre-trained SBERT Model
# We start with a lightweight pre-trained model and fine-tune it
model_name = 'all-MiniLM-L6-v2'
model = SentenceTransformer(model_name)

# 3. Define Loss Function
# CosineSimilarityLoss expects labels between 0 and 1
train_loss = losses.CosineSimilarityLoss(model)

# 4. Train Model
print("Starting Training...")
model.fit(
    train_objectives=[(train_dataloader, train_loss)],
    epochs=4,
    warmup_steps=100,
    show_progress_bar=True
)

# 5. Save Model for FastAPI Download
print("Saving Model...")
model.save("./semantic_relevance_model")

print("Training Complete! Download the 'semantic_relevance_model' folder and put it in your backend prepai_trained_models directory.")
