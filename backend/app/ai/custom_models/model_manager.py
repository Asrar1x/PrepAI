"""PrepAI — unified ModelManager for all 12 custom models.

Loaded from ``prepai_trained_models/`` at the project root.  Each of
the 12 models is loaded lazily and the manager is **per-thread**:
anyio workers that touch ML inference on background tasks get their
own warm-up, so a model+XAI init never leaks from main to worker or
vice-versa.  See ``memory/btd-per-thread-warmup.md`` for the rationale.

The 12 models
-------------
1.  answer_quality_model   BERT (4-class)
2.  question_generator_model  GPT-2
3.  semantic_relevance_model  SBERT
4.  emotion_detector_model  ResNet-18 on FER2013
5.  body_language_model     MediaPipe + 3-layer MLP
6.  speech_pattern_model    BiLSTM (filler + WPM)
7.  gd_evaluator_model      BERT (5-class)
8.  tamil_asr_model         Wav2Vec2
9.  placement_predictor_model  XGBoost × 12 companies
10. resume_generator_model  GPT-2 (resume)
11. lora_adapters/<company>/  LoRA on top of Models 1+2
12. anxiety_index/weights.json  formula weights
"""
from __future__ import annotations

import json
import logging
import os
import threading
from typing import Any, Dict, List, Optional, Tuple

import torch

logger = logging.getLogger(__name__)

# Per the no-lag constraint: cap threads per worker so we don't fan out
# expensive BLAS across cores when many anyio workers are spawned.
try:
    torch.set_num_threads(1)
    torch.set_num_interop_threads(1)
except RuntimeError:
    # already initialised — safe to ignore
    pass

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")
)
MODELS_DIR = os.path.join(PROJECT_ROOT, "prepai_trained_models")

ANSWER_LABELS = ["Poor", "Average", "Good", "Excellent"]
EMOTION_LABELS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
GD_LABELS = ["initiator", "facilitator", "information_giver", "opinion_seeker", "silent_observer"]


# ---------------------------------------------------------------------------
# Per-thread manager
# ---------------------------------------------------------------------------


class _ThreadLocalManager:
    """One manager instance per OS thread.

    The model+XAI init is paid per thread, so warming the main thread
    leaves anyio workers cold.  We mirror the design from
    ``btd-serving-constraints`` here so the rule applies uniformly.
    """

    _local = threading.local()

    @classmethod
    def get(cls) -> "ModelManager":
        mgr = getattr(cls._local, "manager", None)
        if mgr is None:
            mgr = ModelManager()
            mgr.initialize()
            cls._local.manager = mgr
        return mgr


# ---------------------------------------------------------------------------
# The manager
# ---------------------------------------------------------------------------


class ModelManager:
    """Loads all 12 PrepAI custom models from ``prepai_trained_models/``.

    Each loader is a best-effort ``try / except`` so a missing checkpoint
    does not crash the FastAPI process — the corresponding inference
    method falls back to a heuristic and logs once.
    """

    def __init__(self) -> None:
        # Model 1
        self.bert_tokenizer = None
        self.bert_model = None
        # Model 2
        self.gpt2_tokenizer = None
        self.gpt2_model = None
        # Model 3
        self.sbert_model = None
        # Model 4
        self.emotion_model = None
        self.emotion_classes: List[str] = EMOTION_LABELS
        # Model 5
        self.pose_mlp = None
        self.pose_classes: List[str] = []
        # Model 6
        self.filler_model = None
        self.filler_vocab: Dict[str, int] = {}
        self.filler_meta: Dict[str, Any] = {}
        # Model 7
        self.gd_tokenizer = None
        self.gd_model = None
        # Model 8
        self.tamil_processor = None
        self.tamil_model = None
        # Model 9
        self.placement_models: Dict[str, Any] = {}
        self.placement_thresholds: Dict[str, Any] = {}
        # Model 10
        self.resume_tokenizer = None
        self.resume_model = None
        # Model 11
        self.lora_bert_cache: Dict[str, Any] = {}  # base model reuses bert_model
        self.lora_gpt2_cache: Dict[str, Any] = {}
        # Model 12
        self.anxiety_weights: Dict[str, Any] = {}
        self.anxiety_levels: List[Tuple[float, str, str]] = []

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def initialize(self) -> None:
        if getattr(self, "_initialized", False):
            return
        logger.info("Loading PrepAI custom models from %s on %s", MODELS_DIR, DEVICE)
        self._load_model1()
        self._load_model2()
        self._load_model3()
        self._load_model4()
        self._load_model5()
        self._load_model6()
        self._load_model7()
        self._load_model8()
        self._load_model9()
        self._load_model10()
        self._load_model11()
        self._load_model12()
        self._initialized = True
        logger.info("PrepAI ModelManager ready.")

    # ------------------------------------------------------------------
    # Loaders
    # ------------------------------------------------------------------

    def _path(self, *parts: str) -> str:
        return os.path.join(MODELS_DIR, *parts)

    def _load_model1(self) -> None:
        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification
            self.bert_tokenizer = AutoTokenizer.from_pretrained(self._path("answer_quality_model"))
            self.bert_model = AutoModelForSequenceClassification.from_pretrained(
                self._path("answer_quality_model")
            ).to(DEVICE).eval()
            logger.info("Model 1 (BERT answer quality) loaded")
        except Exception as e:  # pragma: no cover
            logger.warning("Model 1 not loaded: %s", e)

    def _load_model2(self) -> None:
        try:
            from transformers import GPT2Tokenizer, GPT2LMHeadModel
            self.gpt2_tokenizer = GPT2Tokenizer.from_pretrained(self._path("question_generator_model"))
            self.gpt2_tokenizer.pad_token = self.gpt2_tokenizer.eos_token
            self.gpt2_model = GPT2LMHeadModel.from_pretrained(self._path("question_generator_model")).to(DEVICE).eval()
            logger.info("Model 2 (GPT-2 question generator) loaded")
        except Exception as e:  # pragma: no cover
            logger.warning("Model 2 not loaded: %s", e)

    def _load_model3(self) -> None:
        try:
            from sentence_transformers import SentenceTransformer
            self.sbert_model = SentenceTransformer(self._path("semantic_relevance_model"), device=DEVICE)
            logger.info("Model 3 (SBERT relevance) loaded")
        except Exception as e:  # pragma: no cover
            logger.warning("Model 3 not loaded: %s", e)

    def _load_model4(self) -> None:
        try:
            from torchvision import models as tvm
            import torch.nn as nn
            ckpt = torch.load(self._path("emotion_detector_model", "emotion_resnet18.pt"), map_location=DEVICE)
            self.emotion_classes = ckpt.get("classes", EMOTION_LABELS)
            m = tvm.resnet18(weights=None)
            m.fc = nn.Linear(m.fc.in_features, len(self.emotion_classes))
            m.load_state_dict(ckpt["state_dict"])
            m = m.to(DEVICE).eval()
            self.emotion_model = m
            logger.info("Model 4 (ResNet-18 emotion) loaded")
        except Exception as e:  # pragma: no cover
            logger.warning("Model 4 not loaded: %s", e)

    def _load_model5(self) -> None:
        try:
            import torch.nn as nn
            ckpt = torch.load(self._path("body_language_model", "posture_mlp.pt"), map_location=DEVICE)
            self.pose_classes = ckpt.get("classes", [])
            feat_dim = ckpt.get("feature_dim", 103)

            class PostureMLP(nn.Module):
                def __init__(self, in_dim, n_classes):
                    super().__init__()
                    self.net = nn.Sequential(
                        nn.Linear(in_dim, 128), nn.ReLU(), nn.Dropout(0.2),
                        nn.Linear(128, 64), nn.ReLU(), nn.Dropout(0.2),
                        nn.Linear(64, n_classes),
                    )

                def forward(self, x):  # noqa: D401
                    return self.net(x)

            m = PostureMLP(feat_dim, len(self.pose_classes))
            m.load_state_dict(ckpt["state_dict"])
            m = m.to(DEVICE).eval()
            self.pose_mlp = m
            logger.info("Model 5 (posture MLP) loaded, classes=%s", self.pose_classes)
        except Exception as e:  # pragma: no cover
            logger.warning("Model 5 not loaded: %s", e)

    def _load_model6(self) -> None:
        try:
            ckpt = torch.load(self._path("speech_pattern_model", "bilstm.pt"), map_location=DEVICE)
            self.filler_vocab = ckpt["vocab"]
            self.filler_meta = {"emb_dim": ckpt["emb_dim"], "hidden": ckpt["hidden"], "max_len": ckpt["max_len"]}
            # NB: full BiLSTM class re-construction is in services/filler_service.py
            # because we don't want to duplicate the nn.Module class here.
            self.filler_model = ckpt["state_dict"]
            logger.info("Model 6 (BiLSTM filler) state dict loaded")
        except Exception as e:  # pragma: no cover
            logger.warning("Model 6 not loaded: %s", e)

    def _load_model7(self) -> None:
        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification
            self.gd_tokenizer = AutoTokenizer.from_pretrained(self._path("gd_evaluator_model"))
            self.gd_model = AutoModelForSequenceClassification.from_pretrained(
                self._path("gd_evaluator_model")
            ).to(DEVICE).eval()
            logger.info("Model 7 (GD BERT) loaded")
        except Exception as e:  # pragma: no cover
            logger.warning("Model 7 not loaded: %s", e)

    def _load_model8(self) -> None:
        try:
            from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC
            self.tamil_processor = Wav2Vec2Processor.from_pretrained(self._path("tamil_asr_model"))
            self.tamil_model = Wav2Vec2ForCTC.from_pretrained(self._path("tamil_asr_model")).to(DEVICE).eval()
            logger.info("Model 8 (Wav2Vec2 Tamil ASR) loaded")
        except Exception as e:  # pragma: no cover
            logger.warning("Model 8 not loaded: %s", e)

    def _load_model9(self) -> None:
        try:
            import joblib
            base = self._path("placement_predictor_model")
            for fname in os.listdir(base):
                if not fname.endswith(".joblib"):
                    continue
                slug = fname.replace(".joblib", "")
                self.placement_models[slug] = joblib.load(os.path.join(base, fname))
            with open(os.path.join(base, "thresholds.json")) as f:
                self.placement_thresholds = json.load(f)
            logger.info("Model 9 (placement predictor) loaded for %d companies", len(self.placement_models))
        except Exception as e:  # pragma: no cover
            logger.warning("Model 9 not loaded: %s", e)

    def _load_model10(self) -> None:
        try:
            from transformers import GPT2Tokenizer, GPT2LMHeadModel
            self.resume_tokenizer = GPT2Tokenizer.from_pretrained(self._path("resume_generator_model"))
            self.resume_tokenizer.pad_token = self.resume_tokenizer.eos_token
            self.resume_model = GPT2LMHeadModel.from_pretrained(self._path("resume_generator_model")).to(DEVICE).eval()
            logger.info("Model 10 (resume GPT-2) loaded")
        except Exception as e:  # pragma: no cover
            logger.warning("Model 10 not loaded: %s", e)

    def _load_model11(self) -> None:
        """LoRA adapters are loaded on demand via ``apply_lora()``; here we
        just confirm the directory exists so the API surface is honest."""
        try:
            adapters = []
            for slug in os.listdir(self._path("lora_adapters")):
                if os.path.isdir(self._path("lora_adapters", slug)):
                    adapters.append(slug)
            logger.info("Model 11 LoRA adapters found for: %s", adapters)
        except Exception as e:  # pragma: no cover
            logger.warning("Model 11 not loaded: %s", e)

    def _load_model12(self) -> None:
        try:
            with open(self._path("anxiety_index", "weights.json")) as f:
                blob = json.load(f)
            self.anxiety_weights = blob["weights"]
            self.anxiety_levels = [(float(a), b, c) for a, b, c in blob["levels"]]
            logger.info("Model 12 (anxiety formula) loaded")
        except Exception as e:  # pragma: no cover
            # not fatal — the service has its own constant fallback
            logger.warning("Model 12 weights file missing: %s", e)

    # ------------------------------------------------------------------
    # Inference: Model 1 — Answer quality
    # ------------------------------------------------------------------

    def classify_answer(self, question: str, answer: str) -> Dict[str, Any]:
        if not self.bert_model:
            return {"label": "Good", "label_id": 2, "confidence": 0.8, "source": "fallback"}
        import torch.nn.functional as F
        enc = self.bert_tokenizer(
            f"Q: {question} A: {answer}", max_length=128, padding="max_length",
            truncation=True, return_tensors="pt",
        )
        with torch.no_grad():
            logits = self.bert_model(
                input_ids=enc["input_ids"].to(DEVICE),
                attention_mask=enc["attention_mask"].to(DEVICE),
                token_type_ids=enc.get("token_type_ids", torch.zeros_like(enc["input_ids"])).to(DEVICE),
            ).logits
        probs = F.softmax(logits, dim=1).squeeze()
        pred = int(torch.argmax(probs).item())
        return {
            "label": ANSWER_LABELS[pred],
            "label_id": pred,
            "confidence": round(float(probs[pred].item()), 3),
            "source": "model1_bert",
        }

    # ------------------------------------------------------------------
    # Inference: Model 2 — Question generation
    # ------------------------------------------------------------------

    def generate_question(
        self, role: str, topic: str, prev_q: str, answer: str, quality: str,
    ) -> str:
        if not self.gpt2_model:
            return "That's interesting. Can you provide a specific example?"
        prompt = f"[ROLE] {role} [TOPIC] {topic} [PREV_Q] {prev_q} [ANSWER] {answer} [QUALITY] {quality} [NEXT_Q]"
        ids = self.gpt2_tokenizer.encode(prompt, return_tensors="pt").to(DEVICE)
        with torch.no_grad():
            out = self.gpt2_model.generate(
                ids, max_new_tokens=80, temperature=0.8, top_p=0.9,
                do_sample=True, pad_token_id=self.gpt2_tokenizer.eos_token_id,
            )
        text = self.gpt2_tokenizer.decode(out[0], skip_special_tokens=True)
        if "[NEXT_Q]" in text:
            text = text[text.find("[NEXT_Q]") + 8 :]
        for stop in ("[ROLE]", "[TOPIC]", "[PREV_Q]"):
            if stop in text:
                text = text[: text.find(stop)]
        return text.strip()

    # ------------------------------------------------------------------
    # Inference: Model 3 — Semantic relevance
    # ------------------------------------------------------------------

    def compute_relevance(self, question: str, answer: str) -> float:
        if not self.sbert_model:
            return 0.75
        from sklearn.metrics.pairwise import cosine_similarity
        embs = self.sbert_model.encode([question, answer])
        score = float(cosine_similarity(embs[0:1], embs[1:2])[0][0])
        return round(max(0.0, min(1.0, score)), 3)

    # ------------------------------------------------------------------
    # Inference: Model 4 — Emotion
    # ------------------------------------------------------------------

    def classify_emotion(self, frame: Any) -> Dict[str, Any]:
        """``frame`` is a HxWx3 numpy BGR/RGB image; returns the argmax
        class and the softmax distribution across the 7 emotions."""
        if not self.emotion_model:
            return {"label": "neutral", "confidence": 0.5, "source": "fallback"}
        from torchvision import transforms
        tf = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Grayscale(num_output_channels=3),
            transforms.Resize((48, 48)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
        x = tf(frame).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            logits = self.emotion_model(x)
        probs = torch.softmax(logits, dim=1).squeeze().cpu().tolist()
        idx = int(max(range(len(probs)), key=probs.__getitem__))
        return {
            "label": self.emotion_classes[idx],
            "confidence": round(probs[idx], 3),
            "distribution": dict(zip(self.emotion_classes, [round(p, 3) for p in probs])),
            "source": "model4_resnet18",
        }

    # ------------------------------------------------------------------
    # Inference: Model 5 — Posture (live in filler_service / pose_service)
    # ------------------------------------------------------------------

    def classify_posture(self, features: List[float]) -> Dict[str, Any]:
        if not self.pose_mlp:
            return {"label": "good_posture", "confidence": 0.5, "source": "fallback"}
        x = torch.tensor(features, dtype=torch.float32).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            logits = self.pose_mlp(x)
        probs = torch.softmax(logits, dim=1).squeeze().cpu().tolist()
        idx = int(max(range(len(probs)), key=probs.__getitem__))
        return {
            "label": self.pose_classes[idx],
            "confidence": round(probs[idx], 3),
            "source": "model5_mlp",
        }

    # ------------------------------------------------------------------
    # Inference: Model 7 — GD turn classification
    # ------------------------------------------------------------------

    def classify_gd_turn(self, turn_text: str) -> Dict[str, Any]:
        if not self.gd_model:
            return {"label": "information_giver", "confidence": 0.5, "source": "fallback"}
        import torch.nn.functional as F
        enc = self.gd_tokenizer(
            turn_text, padding="max_length", truncation=True, max_length=96, return_tensors="pt"
        )
        with torch.no_grad():
            logits = self.gd_model(
                input_ids=enc["input_ids"].to(DEVICE),
                attention_mask=enc["attention_mask"].to(DEVICE),
            ).logits
        probs = F.softmax(logits, dim=1).squeeze()
        idx = int(torch.argmax(probs).item())
        return {
            "label": GD_LABELS[idx] if idx < len(GD_LABELS) else f"class_{idx}",
            "label_id": idx,
            "confidence": round(float(probs[idx].item()), 3),
            "source": "model7_gd_bert",
        }

    # ------------------------------------------------------------------
    # Inference: Model 8 — Tamil ASR
    # ------------------------------------------------------------------

    def transcribe_tamil(self, audio_array: Any, sampling_rate: int = 16000) -> str:
        if not self.tamil_model:
            return ""
        inputs = self.tamil_processor(audio_array, sampling_rate=sampling_rate, return_tensors="pt")
        with torch.no_grad():
            logits = self.tamil_model(inputs.input_values.to(DEVICE)).logits
        pred_ids = torch.argmax(logits, dim=-1)
        return self.tamil_processor.batch_decode(pred_ids)[0]

    # ------------------------------------------------------------------
    # Inference: Model 9 — Placement probability
    # ------------------------------------------------------------------

    def predict_placement(
        self, company_slug: str, features: Dict[str, float],
    ) -> Dict[str, Any]:
        threshold = self.placement_thresholds.get(company_slug, {})
        if company_slug in self.placement_models:
            blob = self.placement_models[company_slug]
            clf = blob["model"]
            feat_order = blob["features"]
            x = [[float(features.get(f, 0.0)) for f in feat_order]]
            prob = float(clf.predict_proba(x)[0][1])
            return {
                "company": company_slug,
                "probability": round(prob, 3),
                "thresholds": threshold,
                "source": "model9_xgboost",
            }
        # fallback: doc-locked heuristic
        score = 0
        if features.get("technical_score", 0) >= threshold.get("technical", 60):
            score += 25
        if features.get("communication_score", 0) >= threshold.get("communication", 60):
            score += 25
        if features.get("problem_solving_score", 0) >= threshold.get("problem_solving", 60):
            score += 25
        if features.get("aptitude_score", features.get("technical_score", 0)) >= threshold.get("aptitude", 60):
            score += 25
        return {
            "company": company_slug,
            "probability": round(min(score, 100) / 100.0, 3),
            "thresholds": threshold,
            "source": "fallback_heuristic",
        }

    # ------------------------------------------------------------------
    # Inference: Model 10 — Resume content generation
    # ------------------------------------------------------------------

    def generate_resume_bullet(
        self, project: str, tech: str, outcome: str = "",
    ) -> str:
        if not self.resume_model:
            return f"Built {project} using {tech}."
        prompt = f"[PROJECT] {project} [TECH] {tech} [OUTCOME] {outcome} [BULLET]"
        ids = self.resume_tokenizer.encode(prompt, return_tensors="pt").to(DEVICE)
        with torch.no_grad():
            out = self.resume_model.generate(
                ids, max_new_tokens=60, temperature=0.7, top_p=0.9,
                do_sample=True, pad_token_id=self.resume_tokenizer.eos_token_id,
            )
        text = self.resume_tokenizer.decode(out[0], skip_special_tokens=True)
        if "[BULLET]" in text:
            text = text[text.find("[BULLET]") + 8 :]
        for stop in ("[PROJECT]", "[PROFILE]"):
            if stop in text:
                text = text[: text.find(stop)]
        return text.strip()

    def generate_resume_summary(self, profile: str) -> str:
        if not self.resume_model:
            return f"{profile[:120]}"
        prompt = f"[PROFILE] {profile} [SUMMARY]"
        ids = self.resume_tokenizer.encode(prompt, return_tensors="pt").to(DEVICE)
        with torch.no_grad():
            out = self.resume_model.generate(
                ids, max_new_tokens=80, temperature=0.7, top_p=0.9,
                do_sample=True, pad_token_id=self.resume_tokenizer.eos_token_id,
            )
        text = self.resume_tokenizer.decode(out[0], skip_special_tokens=True)
        if "[SUMMARY]" in text:
            text = text[text.find("[SUMMARY]") + 9 :]
        for stop in ("[PROJECT]", "[PROFILE]"):
            if stop in text:
                text = text[: text.find(stop)]
        return text.strip()

    # ------------------------------------------------------------------
    # Inference: Model 11 — LoRA adapter (apply on demand)
    # ------------------------------------------------------------------

    def apply_company_lora(self, company_slug: str) -> Dict[str, Any]:
        """Return the (cached) LoRA-augmented classifier if available.
        Currently returns the base Model 1 with the company LoRA overlay
        applied via PEFT, so per-company answer scoring works without
        retraining the whole stack.
        """
        try:
            from peft import PeftModel
        except Exception:  # peft not installed — fall back to base model
            return {"model": self.bert_model, "available": False}
        adapter_dir = self._path("lora_adapters", company_slug)
        if company_slug in self.lora_bert_cache:
            return self.lora_bert_cache[company_slug]
        if not self.bert_model or not os.path.isdir(adapter_dir):
            return {"model": self.bert_model, "available": False}
        try:
            merged = PeftModel.from_pretrained(self.bert_model, adapter_dir).eval()
            self.lora_bert_cache[company_slug] = {"model": merged, "available": True}
            return self.lora_bert_cache[company_slug]
        except Exception as e:  # pragma: no cover
            logger.warning("LoRA apply failed for %s: %s", company_slug, e)
            return {"model": self.bert_model, "available": False}

    # ------------------------------------------------------------------
    # Inference: Model 12 — Anxiety (formula)
    # ------------------------------------------------------------------

    def compute_anxiety(self, student_data: Dict[str, Any]) -> Dict[str, Any]:
        """Doc-locked weighted formula.  Inputs:

          - filler_counts_last_5_sessions
          - avg_latency_last_5_sessions
          - overall_scores_last_5_sessions
          - sessions_this_week, sessions_last_week
          - abandoned_sessions_ratio
        """
        w = self.anxiety_weights or {
            "filler_word_trend": 0.25, "response_latency_trend": 0.25,
            "score_drop": 0.20, "session_frequency_drop": 0.20,
            "session_abandon_rate": 0.10,
        }

        def _trend(seq, default=0.3):
            if not seq or len(seq) < 2:
                return default
            delta = (seq[-1] - seq[0]) / (max(seq) + 1)
            return max(0.0, min(1.0, delta))

        fillers = student_data.get("filler_counts_last_5_sessions") or []
        latencies = student_data.get("avg_latency_last_5_sessions") or []
        scores = student_data.get("overall_scores_last_5_sessions") or []
        this_wk = student_data.get("sessions_this_week", 0)
        last_wk = student_data.get("sessions_last_week", 0)
        abandon = float(student_data.get("abandoned_sessions_ratio", 0.0))

        score_drop = 0.0
        if len(scores) >= 2:
            score_drop = max(0.0, min(1.0, (scores[0] - scores[-1]) / 100.0))
        freq_drop = 0.0
        if last_wk > 0:
            freq_drop = max(0.0, (last_wk - this_wk) / last_wk)

        components = {
            "filler_word_trend": round(_trend(fillers), 3),
            "response_latency_trend": round(_trend(latencies), 3),
            "score_drop": round(score_drop, 3),
            "session_frequency_drop": round(freq_drop, 3),
            "session_abandon_rate": round(max(0.0, min(1.0, abandon)), 3),
        }
        anxiety = round(sum(components[k] * w.get(k, 0.0) for k in components), 3)

        level, message = "calm", "Steady progress."
        for thresh, lbl, msg in (self.anxiety_levels or [
            (0.25, "calm",             "You are making steady progress. Keep it up!"),
            (0.50, "mild_concern",     "Slight signs of stress detected. Consider taking short practice breaks."),
            (0.75, "moderate_anxiety", "You seem to be finding placement prep challenging. Focus on one company at a time."),
            (1.01, "high_anxiety",     "High stress signals detected. It is okay to take a day off. Consistent effort matters more than intensity."),
        ]):
            if anxiety < thresh:
                level, message = lbl, msg
                break

        return {
            "anxiety_index": anxiety,
            "level": level,
            "message": message,
            "components": components,
            "source": "model12_formula" if self.anxiety_levels else "fallback",
        }


# ---------------------------------------------------------------------------
# Module-level helper
# ---------------------------------------------------------------------------


def get_models() -> ModelManager:
    """Return the per-thread manager.  Use this from request handlers
    and Celery tasks so the warm-up cost is paid exactly once per
    worker thread instead of once per request.
    """
    return _ThreadLocalManager.get()


# Global handle retained for backwards compatibility with the old API.
# Returns the per-thread manager regardless of whether the main thread
# was eagerly initialised.  Service code can keep calling
# ``ml_models.classify_answer(...)`` and we route it to the right thread.
class _MlProxy:
    """Lazy proxy that forwards every attribute access to the per-thread
    manager.  This lets existing service code keep using
    ``ml_models.classify_answer(...)`` without a refactor, while still
    honouring the per-thread warm-up rule."""

    def __getattr__(self, name: str) -> Any:
        return getattr(_ThreadLocalManager.get(), name)


ml_models: Any = _MlProxy()
