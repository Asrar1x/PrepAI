/**
 * Versioned prompt loader (spec §27). Each prompt file has a front-matter `version:` line that
 * is stored with every evaluation/turn so results stay auditable when prompts change.
 */
const fs = require('fs');
const path = require('path');

const cache = new Map();

function loadPrompt(name) {
  if (cache.has(name)) return cache.get(name);
  const raw = fs.readFileSync(path.join(__dirname, `${name}.md`), 'utf8');
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  const meta = {};
  let body = raw;
  if (match) {
    match[1].split('\n').forEach(line => {
      const idx = line.indexOf(':');
      if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    });
    body = match[2];
  }
  const prompt = { name, version: meta.version || `${name}-unversioned`, text: body.trim() };
  cache.set(name, prompt);
  return prompt;
}

function renderPrompt(name, vars = {}) {
  const prompt = loadPrompt(name);
  const text = prompt.text.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] === undefined || vars[key] === null ? '' : String(vars[key])));
  return { ...prompt, text };
}

module.exports = { loadPrompt, renderPrompt };
