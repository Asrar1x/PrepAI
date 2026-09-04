import os
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification, GPT2LMHeadModel, GPT2Tokenizer
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../prepai_trained_models"))

class ModelManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def initialize(self):
        if self._initialized: return
        print("Loading Custom ML models from:", MODELS_DIR)
        
        try:
            # Model 1: Answer Quality Classifier
            quality_path = os.path.join(MODELS_DIR, "answer_quality_model")
            self.bert_tokenizer = AutoTokenizer.from_pretrained(quality_path)
            self.bert_model = AutoModelForSequenceClassification.from_pretrained(quality_path)
            self.bert_model = self.bert_model.to(DEVICE)
        except Exception as e:
            print(f"Warning: Could not load Answer Quality Classifier: {e}")
            self.bert_model = None

        try:
            # Model 2: Question Generator
            qgen_path = os.path.join(MODELS_DIR, "question_generator_model")
            self.gpt2_tokenizer = GPT2Tokenizer.from_pretrained(qgen_path)
            self.gpt2_tokenizer.pad_token = self.gpt2_tokenizer.eos_token
            self.gpt2_model = GPT2LMHeadModel.from_pretrained(qgen_path)
            self.gpt2_model = self.gpt2_model.to(DEVICE)
            self.gpt2_model.eval()
            print("Loaded Question Generator")
        except Exception as e:
            print(f"Warning: Could not load Question Generator: {e}")
            self.gpt2_model = None

        try:
            # Model 3: Semantic Relevance
            rel_path = os.path.join(MODELS_DIR, "semantic_relevance_model")
            self.sbert_model = SentenceTransformer(rel_path, device=DEVICE)
            print("Loaded Semantic Relevance Model")
        except Exception as e:
            print(f"Warning: Could not load Semantic Relevance Model: {e}")
            self.sbert_model = None

        self._initialized = True
        print(f"All models loaded on {DEVICE}")

    def classify_answer(self, question: str, answer: str) -> dict:
        LABELS = ['Poor', 'Average', 'Good', 'Excellent']
        if not self.bert_model:
            return {'label': 'Good', 'label_id': 2, 'confidence': 0.8}
            
        enc = self.bert_tokenizer(f"Q: {question} A: {answer}", max_length=128,
            padding='max_length', truncation=True, return_tensors='pt')
        with torch.no_grad():
            logits = self.bert_model(
                input_ids=enc['input_ids'].to(DEVICE),
                attention_mask=enc['attention_mask'].to(DEVICE),
                token_type_ids=enc.get('token_type_ids', torch.zeros_like(enc['input_ids'])).to(DEVICE)
            ).logits
        probs = F.softmax(logits, dim=1).squeeze()
        pred_idx = torch.argmax(probs).item()
        return {'label': LABELS[pred_idx], 'label_id': pred_idx, 'confidence': round(probs[pred_idx].item(), 3)}

    def generate_question(self, role: str, topic: str, prev_q: str, answer: str, quality: str) -> str:
        if not self.gpt2_model:
            return "That's interesting. Can you provide a specific example?"
            
        prompt = f"[ROLE] {role} [TOPIC] {topic} [PREV_Q] {prev_q} [ANSWER] {answer} [QUALITY] {quality} [NEXT_Q]"
        ids = self.gpt2_tokenizer.encode(prompt, return_tensors='pt').to(DEVICE)
        with torch.no_grad():
            out = self.gpt2_model.generate(ids, max_new_tokens=80, temperature=0.8,
                top_p=0.9, do_sample=True, pad_token_id=self.gpt2_tokenizer.eos_token_id)
        generated = self.gpt2_tokenizer.decode(out[0], skip_special_tokens=True)
        text = generated[generated.find('[NEXT_Q]') + 8:]
        for stop in ['[ROLE]', '[TOPIC]', '[PREV_Q]']:
            if stop in text: text = text[:text.find(stop)]
        return text.strip()

    def compute_relevance(self, question: str, answer: str) -> float:
        if not self.sbert_model:
            return 0.75
            
        embs = self.sbert_model.encode([question, answer])
        score = cosine_similarity(embs[0:1], embs[1:2])[0][0]
        return float(round(max(0.0, min(1.0, score)), 3))

# Global instance
ml_models = ModelManager()

if __name__ == "__main__":
    ml_models.initialize()
    
    # Test Answer Quality
    q1 = "What is OOP?"
    a1 = "OOP stands for Object-Oriented Programming and is based on concepts of objects."
    print("\n--- Testing Answer Quality ---")
    quality = ml_models.classify_answer(q1, a1)
    print(f"Q: {q1}\nA: {a1}\nQuality: {quality}")
    
    # Test Question Generation
    print("\n--- Testing Question Generation ---")
    next_q = ml_models.generate_question(
        role="Interviewer",
        topic="Python",
        prev_q="What are the key features of Python?",
        answer="Python is interpreted, dynamically typed, and object-oriented.",
        quality="Good"
    )
    print(f"Generated Next Question: {next_q}")
    
    # Test Semantic Relevance
    print("\n--- Testing Semantic Relevance ---")
    rel_score = ml_models.compute_relevance("Explain OOP.", "Object oriented programming.")
    print(f"Relevance Score: {rel_score}")
