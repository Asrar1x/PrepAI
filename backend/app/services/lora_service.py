"""Model 11 — Company-Specific LoRA Adapters.

A thin convenience layer around ``model_manager.apply_company_lora``.
Use this when scoring an answer against a *specific* company so the
BERT classifier is biased toward that company's interview style
(initiator for Amazon, structured for TCS, deepest for Zoho, etc.).
"""
from __future__ import annotations

import logging
from typing import Any, Dict

from app.ai.custom_models.model_manager import get_models

logger = logging.getLogger(__name__)


def score_answer_for_company(
    company_slug: str, question: str, answer: str
) -> Dict[str, Any]:
    """Score an answer with the per-company LoRA overlay if available."""
    models = get_models()
    overlay = models.apply_company_lora(company_slug)
    if not overlay.get("available"):
        # base BERT only
        return models.classify_answer(question, answer)

    # The PEFT-merged model has the same forward signature as the base.
    try:
        import torch
        import torch.nn.functional as F
        bert = overlay["model"]
        tokenizer = models.bert_tokenizer
        enc = tokenizer(
            f"Q: {question} A: {answer}", max_length=128, padding="max_length",
            truncation=True, return_tensors="pt",
        )
        device = next(bert.parameters()).device
        with torch.no_grad():
            logits = bert(
                input_ids=enc["input_ids"].to(device),
                attention_mask=enc["attention_mask"].to(device),
                token_type_ids=enc.get("token_type_ids", torch.zeros_like(enc["input_ids"])).to(device),
            ).logits
        probs = F.softmax(logits, dim=1).squeeze()
        pred = int(torch.argmax(probs).item())
        LABELS = ["Poor", "Average", "Good", "Excellent"]
        return {
            "label": LABELS[pred],
            "label_id": pred,
            "confidence": round(float(probs[pred].item()), 3),
            "source": f"model1_bert+lora_{company_slug}",
        }
    except Exception as e:  # pragma: no cover
        logger.warning("LoRA scoring failed, falling back to base: %s", e)
        return models.classify_answer(question, answer)


__all__ = ["score_answer_for_company"]
