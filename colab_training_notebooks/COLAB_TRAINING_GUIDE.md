# Google Colab Training Guide for PrepAI Models

As outlined in the `PrepAI_All_Custom_Models.docx` document, the PrepAI architecture relies on zero external AI APIs. Instead, it uses custom trained machine learning models. Because model training requires GPU power, we use Google Colab.

We have generated the training scripts for the 3 core models for you.

## Files Created
You can find these inside the `colab_training_notebooks` folder in your project:
1. `model1_bert_classifier.py` - Answer Quality Classifier (BERT)
2. `model2_gpt2_question_gen.py` - Interview Question Generator (GPT-2)
3. `model3_sbert_relevance.py` - Semantic Answer Relevance (Sentence-BERT)

## Step-by-Step Training Instructions

### Step 1: Open Google Colab
1. Go to [Google Colab](https://colab.research.google.com/).
2. Click **New Notebook**.
3. Go to `Runtime > Change runtime type` and set hardware accelerator to **T4 GPU** (or V100/A100 if you have Colab Pro).

### Step 2: Upload and Run the Training Scripts
1. Open one of the `.py` files we generated (e.g., `model1_bert_classifier.py`).
2. Copy the entire code.
3. In your Colab notebook, paste the code into a cell.
4. Add this command in the very first cell of the notebook and run it to install dependencies:
   ```bash
   !pip install transformers datasets torch scikit-learn pandas sentence-transformers
   ```
5. Run the cell with the pasted python code. The model will download the base weights and start fine-tuning on the synthetic dataset provided in the script.

*Note: In production, you will replace the synthetic dummy data dictionaries in the script with a `pd.read_csv()` loading your actual curated datasets as specified in your `.docx` document.*

### Step 3: Download the Trained Models
1. Once training is complete (usually 5-15 mins on Colab for these sizes), you will see a new folder created in the Colab file explorer on the left (e.g., `answer_quality_model`).
2. Zip the folder by running this in a new Colab cell:
   ```bash
   !zip -r answer_quality_model.zip answer_quality_model/
   ```
3. Right-click the `.zip` file and select **Download**.

### Step 4: Deploying to PrepAI Local Server
1. Create a folder named `prepai_trained_models` in the root of your `Mini project` directory.
2. Extract the downloaded models into this folder.
3. Your directory structure should look exactly like this:
   ```text
   Mini project/
   ├── prepai_trained_models/
   │   ├── answer_quality_model/
   │   │   ├── config.json
   │   │   ├── pytorch_model.bin
   │   │   └── vocab.txt
   │   ├── question_generator_model/
   │   └── semantic_relevance_model/
   ├── backend/
   │   └── app/
   └── src/
   ```
4. Restart your FastAPI backend server. The `ModelManager` class (in `backend/app/ai/custom_models/model_manager.py`) will automatically detect these folders, load the trained weights into memory on startup, and start using them for the mock interviews instead of the fallback dummy logic!

That's it! Your system is now 100% self-hosted and independent.
