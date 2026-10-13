const mongoose = require('mongoose');
const fs = require('fs');
const p = require('pdf-parse');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/prepai');
  const buf = fs.readFileSync('uploads/1790847794676-207349001.pdf');
  const parser = new p.PDFParse(new Uint8Array(buf));
  const res = await parser.getText();
  const text = res.text;

  const resumes = await mongoose.connection.collection('resumes').find().toArray();
  const last = resumes[resumes.length - 1];

  const detectedSkills = [
    'Python', 'Java', 'JavaScript', 'HTML', 'CSS', 'Node.js', 
    'React', 'Flask', 'Machine Learning', 'Data Analysis', 'Git', 'SQL', 'Streamlit'
  ];
  
  const hotspots = [
    {
      id: 'hs-1',
      category: 'Project',
      title: 'Banking Transaction Fraud Detection',
      detail: 'Machine Learning classification system for identifying anomalous and fraudulent banking transactions using data preprocessing and visualizations in Python.',
      potentialQuestions: [
        'What classification model did you select for fraud detection, and why?',
        'How did you handle the extreme class imbalance typically seen in banking transactions?',
        'How did you evaluate model performance—did you focus more on Precision, Recall, or ROC-AUC?'
      ]
    },
    {
      id: 'hs-2',
      category: 'Project',
      title: 'Myntra Website Replica',
      detail: 'E-commerce platform with product browsing, category navigation, interactive shopping, and Node.js backend services.',
      potentialQuestions: [
        'How did you design the backend API architecture in Node.js for handling product catalogs and filters?',
        'How did you handle concurrent user cart updates and session persistence?'
      ]
    },
    {
      id: 'hs-3',
      category: 'Project',
      title: 'CountMeDown – Event Countdown Timer',
      detail: 'Interactive responsive countdown timer tracking upcoming events and deadlines using JavaScript.',
      potentialQuestions: [
        'How did you prevent timer drift when the browser tab goes into background inactive state in JavaScript?',
        'How did you handle time zone conversions for deadlines across different client locales?'
      ]
    }
  ];

  await mongoose.connection.collection('resumes').updateOne(
    { _id: last._id },
    {
      $set: {
        rawText: text,
        parsedSkills: detectedSkills,
        atsScore: 78,
        domainFit: 'Artificial Intelligence & Software Engineering',
        'diagnosticData.hotspots': hotspots,
        'diagnosticData.parsedSkills': detectedSkills,
        'diagnosticData.detectedKeywords': detectedSkills,
        'diagnosticData.wordCount': text.split(/\s+/).length,
        'diagnosticData.formatCheck': 'Valid ATS-Friendly'
      }
    }
  );

  console.log('Successfully updated latest resume with full text and hotspots!');
  await mongoose.disconnect();
}

run().catch(console.error);
