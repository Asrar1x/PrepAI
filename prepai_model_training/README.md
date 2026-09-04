# PrepAI — Custom Model Training Pipeline

This folder contains one training script per custom model used in
PrepAI, the dataset layout, and the execution order that matches the
authoritative `PrepAI_All_Custom_Models.docx` (§16).

## Folder layout

```
prepai_model_training/
├── scripts/           # one .py per model (model1..model12)
├── datasets/          # raw training data per model
└── master_train.sh    # runs all 12 in the doc-locked order
```

The trained artefacts themselves live in **`prepai_trained_models/`**
at the project root — a separate folder from the main code, as you
asked for.  `backend/app/ai/custom_models/model_manager.py` loads
from there on FastAPI startup.

## Training order (Tier 1 → Tier 3, doc §16)

| Tier | Model | Script | Time | GPU |
|------|-------|--------|------|-----|
| 1    | 9     | `model9_placement_predictor.py` | 5 min | no |
| 1    | 12    | `model12_anxiety_index.py`     | 0 min | no |
| 2    | 1     | `model1_answer_classifier.py`  | 3 h   | yes |
| 2    | 3     | `model3_semantic_relevance.py` | 2 h   | yes |
| 2    | 5     | `model5_body_language.py`      | 10 m  | no |
| 2    | 6     | `model6_filler_bilstm.py`      | 2 h   | yes |
| 3    | 2     | `model2_question_generator.py` | 5 h   | yes |
| 3    | 10    | `model10_resume_generator.py`  | 4 h   | yes |
| 3    | 4     | `model4_emotion_detector.py`   | 4 h   | yes |
| 3    | 7     | `model7_gd_evaluator.py`       | 1 h   | yes |
| 3    | 8     | `model8_tamil_asr.py`          | 6 h   | A100 |
| 3    | 11×12 | `model11_lora.py` (per company)| 30 m × 12 | yes |

Total: ≈ 30–35 hours on free Colab GPU.  Parallelise across multiple
Colab sessions when you can.

## Quick start

```bash
# Tier 1: pure CPU
python scripts/model9_placement_predictor.py
python scripts/model12_anxiety_index.py

# Tier 2: needs GPU
python scripts/model1_answer_classifier.py
python scripts/model3_semantic_relevance.py
python scripts/model5_body_language.py
python scripts/model6_filler_bilstm.py

# Tier 3: needs GPU (heavier)
python scripts/model2_question_generator.py
python scripts/model10_resume_generator.py
python scripts/model4_emotion_detector.py
python scripts/model7_gd_evaluator.py
python scripts/model8_tamil_asr.py

# 12 LoRA adapters (one per company)
for c in tcs infosys wipro zoho amazon accenture cognizant hcl \
         capgemini freshworks hexaware ltinfotech; do
  COMPANY=$c python scripts/model11_lora.py
done
```

## Dataset expectations (one-line per model)

| Model | Source | Size | Format |
|-------|--------|------|--------|
| 1     | custom Q&A (ChatGPT + manual)         | 5–10k | CSV: question, answer, label |
| 2     | custom interview transcripts          | 3k+   | TXT: `[ROLE]…[NEXT_Q]…` |
| 3     | HuggingFace `stanfordnlp/snli`        | 20k   | auto  |
| 4     | Kaggle `msambare/fer2013`             | 35k   | folder/label |
| 5     | self-collected via `collect_pose.py`  | 900   | CSV: features, label |
| 6     | Common Voice transcripts              | 1k windows | CSV: tokens, tags, wpm |
| 7     | custom GD transcripts                 | 5k    | CSV: turn_text, label |
| 8     | OpenSLR-65 / AI4Bharat IndicSUPERB    | 10h+  | audio + transcript |
| 9     | custom placement outcomes             | 200+  | CSV: 17 features + label |
| 10    | GitHub resume datasets                | 2.5k  | TXT: `[PROJECT]…[BULLET]` |
| 11    | Glassdoor + ChatGPT per company       | 150–300 | CSV: question, answer, label |
| 12    | none — formula                        | n/a   | n/a |

## Notes

- All scripts respect `PREPAI_MODEL{N}_DATA` / `PREPAI_MODEL{N}_OUT`
  env vars so the same code can target Colab paths or local.
- `model11_lora.py` reads `COMPANY=tcs|infosys|...` to pick the
  dataset and output dir.
- The model_manager in the backend auto-detects which checkpoints are
  present and falls back to heuristics/mocks for the rest, so you
  can ship the build incrementally as models come back from Colab.
