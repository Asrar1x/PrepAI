#!/usr/bin/env bash
# PrepAI — master training pipeline.
# Runs all 12 models in the order from PrepAI_All_Custom_Models.docx §16.
#
# Usage:
#   cd prepai_model_training
#   bash master_train.sh

set -e
cd "$(dirname "$0")"

echo "====== PrepAI Complete Model Training Pipeline ======"

pip install transformers datasets sentence-transformers torch peft xgboost >/dev/null
pip install mediapipe opencv-python whisper soundfile librosa tqdm pandas scikit-learn joblib -q

mkdir -p ../prepai_trained_models/{emotion_detector_model,body_language_model,speech_pattern_model,gd_evaluator_model,tamil_asr_model,placement_predictor_model,resume_generator_model,lora_adapters,anxiety_index}

# --- Tier 1: no GPU ---
echo "[1/12] Placement Predictor (XGBoost, ~5 min, CPU)..."
python scripts/model9_placement_predictor.py
echo "[2/12] Anxiety Index (formula, 0 min)..."
python scripts/model12_anxiety_index.py

# --- Tier 2: GPU ---
echo "[3/12] Answer Quality Classifier (BERT, ~3 h)..."
python scripts/model1_answer_classifier.py
echo "[4/12] Semantic Relevance (SBERT, ~2 h)..."
python scripts/model3_semantic_relevance.py
echo "[5/12] Body Language (MLP, ~10 min, CPU OK)..."
python scripts/model5_body_language.py
echo "[6/12] Filler Word Detector (BiLSTM, ~2 h)..."
python scripts/model6_filler_bilstm.py

# --- Tier 3: heavy GPU ---
echo "[7/12] Question Generator (GPT-2, ~5 h)..."
python scripts/model2_question_generator.py
echo "[8/12] Resume Generator (GPT-2, ~4 h)..."
python scripts/model10_resume_generator.py
echo "[9/12] Emotion Detector (ResNet-18, ~4 h)..."
python scripts/model4_emotion_detector.py
echo "[10/12] GD Evaluator (BERT sequential, ~1 h)..."
python scripts/model7_gd_evaluator.py
echo "[11/12] Tamil ASR (Wav2Vec2, ~6 h on A100)..."
python scripts/model8_tamil_asr.py
echo "[12/12] 12 LoRA adapters (~30 min each)..."
for c in tcs infosys wipro zoho amazon accenture cognizant hcl capgemini freshworks hexaware ltinfotech; do
  echo "  → $c"
  COMPANY=$c python scripts/model11_lora.py
done

echo "====== ALL 12 MODELS TRAINED ======"
echo "Total: ~30-35h on Colab GPU. Artefacts in ../prepai_trained_models/"
