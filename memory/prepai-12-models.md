---
name: prepai-12-models
description: PrepAI 12-custom-model architecture — folder layout, training pipeline, manager, services, per-thread warm-up
metadata:
  type: project
---

PrepAI uses 12 custom trained models (zero external AI API dependency on the
intelligence layer, per the user's 2026-09-04 request).  Layout:

- `prepai_trained_models/` (root) — **separate folder from main code**, holds
  one subdir per model + per-company LoRA adapters.  Already exists.
- `prepai_model_training/` (root) — separate folder for the training scripts.
  `scripts/model{1..12}_*.py` and `master_train.sh` execute in the doc-locked
  order (Tier 1 → Tier 3).  Includes `scripts/collect_pose.py` for webcam
  data collection (Model 5).

Manager: `backend/app/ai/custom_models/model_manager.py` is **per-thread**
(`_ThreadLocalManager`), honours the no-lag rule by capping
`torch.set_num_threads(1)`, and gracefully logs + falls back if a
checkpoint is missing.  Use `get_models()` or the `ml_models` proxy in
service code — both return the current thread's manager.

Service wiring (2026-09-04):
- `scoring_service.py`  — Model 1 (BERT) for technical_knowledge, Model 3
  (SBERT) for relevance, Model 12 (formula) for anxiety; lexical heuristics
  remain as fallback.
- `aptitude_service.py` — Model 2 (GPT-2) first, Claude Haiku as 50% upgrade,
  deterministic bank as last resort.
- `resume_service.py`  — Model 10 (resume GPT-2) for bullet polish,
  Model 3 (SBERT) for role-fit, Claude parser as quality upgrade.
- `emotion_service.py` (Model 4), `pose_service.py` (Model 5),
  `filler_service.py` (Model 6), `gd_service.py` (Model 7),
  `tamil_asr_service.py` (Model 8 with Whisper fallback),
  `placement_service.py` (Model 9), `lora_service.py` (Model 11),
  `anxiety_service.py` (Model 12) — new service modules in
  `backend/app/services/`.

Test status: `pytest backend/tests/unit -q` → 12/12 pass.

Why: User asked to train all 12 models from `PrepAI_All_Custom_Models.docx`,
keep them in a separate folder, and have the backend actually use them.
How to apply: Run `bash prepai_model_training/master_train.sh` on Colab,
copy the per-model subdirs into `prepai_trained_models/`, and the
backend picks them up automatically.  Missing models → heuristic fallback.
