/**
 * Compares generation models on the same benchmark set, rubric and metrics (spec §28.3).
 *   node src/evals/compareModelProviders.js qwen2.5-coder:7b qwen3:8b [--limit=N]
 */
process.chdir(require('path').join(__dirname, '../..'));
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config/env');
const { runBenchmark } = require('../services/benchmarkService');

async function main() {
  const args = process.argv.slice(2);
  const models = args.filter(a => !a.startsWith('--'));
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
  if (!models.length) models.push(config.ai.evaluationModel);
  await mongoose.connect(config.mongoUri);
  const comparison = [];
  for (const model of models) {
    console.log(`\n=== ${model} ===`);
    const out = await runBenchmark({ model, limit, onProgress: (i, n) => { if (i % 10 === 0 || i === n) console.log(`  ${i}/${n}`); } });
    comparison.push(out);
    console.log(JSON.stringify(out.results, null, 2));
  }
  fs.writeFileSync(path.join(__dirname, 'modelComparisonReport.json'), JSON.stringify({ datasetId: 'prepai-eval-120-v1', evaluatorVersion: config.evaluation.version, finishedAt: new Date().toISOString(), comparison }, null, 2));
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
