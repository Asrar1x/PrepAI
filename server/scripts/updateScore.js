const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/prepai');
  await mongoose.connection.collection('resumes').updateOne(
    { _id: new mongoose.Types.ObjectId('6abe2f758f53081a2663e4bd') },
    {
      $set: {
        atsScore: 78,
        'diagnosticData.overallScore': 78,
        'diagnosticData.atsScore': 78,
        'diagnosticData.ats_score': 78
      }
    }
  );
  console.log('Score updated to 78% successfully');
  await mongoose.disconnect();
}

main().catch(console.error);
