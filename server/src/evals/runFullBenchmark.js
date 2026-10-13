/**
 * Runs the PrepAI evaluation benchmark (spec §28) against the configured or given model.
 *   node src/evals/runFullBenchmark.js [model] [--limit=N]
 * Writes src/evals/benchmarkReport.json and stores BenchmarkResult rows in MongoDB.
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
  const model = args.find(a => !a.startsWith('--')) || config.ai.evaluationModel;
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
  await mongoose.connect(config.mongoUri);
  console.log(`Benchmark: model=${model} laya=${config.laya.model} evaluator=${config.evaluation.version}${limit ? ` limit=${limit}` : ''}`);
  const out = await runBenchmark({
    model,
    limit,
    onProgress: (i, n, id, cls, score) => console.log(`  [${i}/${n}] ${id} → ${cls} ${score === null ? '' : score}`)
  });
  const reportPath = path.join(__dirname, 'benchmarkReport.json');
  const existing = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : {};
  const runs = Array.isArray(existing.runs) ? existing.runs : [];
  runs.push({ ...out, finishedAt: new Date().toISOString(), evaluatorVersion: config.evaluation.version });
  fs.writeFileSync(reportPath, JSON.stringify({ datasetId: 'prepai-eval-120-v1', runs }, null, 2));
  console.log(JSON.stringify(out.results, null, 2));
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
