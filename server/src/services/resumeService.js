/**
 * Resume intelligence (spec §13).
 *   PDF validation → PyMuPDF extraction (Python service; pdf-parse if that service is down)
 *   → normalisation → structured extraction (LLM, JSON schema) → evidence check against the
 *   source text (anything not found verbatim is dropped — "never invent resume facts")
 *   → ATS-style analysis on the spec's six dimensions → interview hot spots.
 */
const fs = require('fs');
const pdfParse = require('pdf-parse');
const layaClient = require('./layaClient');
const { providerFactory } = require('./providers/AIProviderFactory');
const { computeEmbeddingSignals } = require('./semanticEngine');
const { renderPrompt } = require('../prompts');
const { parseModelJson } = require('./jsonOutput');
const { ROLES } = require('../seeds/seedData');

const ANALYSIS_VERSION = 'resume-analysis-v2';
const ATS_WEIGHTS = { structure: 15, skillsAlignment: 25, projectEvidence: 20, experienceEvidence: 15, keywordRelevance: 15, completeness: 10 };
const ACTION_VERBS = /\b(built|developed|designed|implemented|engineered|created|led|optimized|optimised|reduced|increased|improved|automated|deployed|migrated|architected|integrated|launched|analyzed|analysed|trained|delivered)\b/i;
const METRIC = /\b\d+(\.\d+)?\s*(%|x\b|ms\b|users?\b|requests?\b|seconds?\b|hours?\b|k\b|m\b|million|lakh|crore)|\b\d{2,}\b/i;
const SECTION_HEADINGS = {
  summary: /^(summary|profile|objective|about me)\b/im,
  education: /^(education|academic|qualifications?)\b/im,
  skills: /^(technical skills|skills|core competencies|technologies)\b/im,
  projects: /^(projects?|academic projects|personal projects)\b/im,
  experience: /^(experience|work experience|internships?|employment)\b/im,
  certifications: /^(certifications?|courses|licenses)\b/im,
  achievements: /^(achievements|awards|accomplishments|extra.?curricular)\b/im
};

function normaliseText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[•▪●◦■]/g, '- ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractText(filePath, filename) {
  const buffer = fs.readFileSync(filePath);
  try {
    const out = await layaClient.extractResumeText(buffer, filename);
    return { text: normaliseText(out.text), pageCount: out.page_count, links: out.links || [], extractor: 'pymupdf' };
  } catch (err) {
    if (err.status && err.status < 500) throw err; // invalid PDF: surface it
    // Python service unavailable → Node PDF parser, recorded on the analysis
    let text = '';
    if (pdfParse.PDFParse) {
      const parser = new pdfParse.PDFParse(new Uint8Array(buffer));
      const parsed = await parser.getText();
      text = typeof parsed?.text === 'string' ? parsed.text : '';
    } else if (typeof pdfParse === 'function') {
      text = (await pdfParse(buffer)).text || '';
    }
    return { text: normaliseText(text), pageCount: null, links: [], extractor: 'pdf-parse' };
  }
}

function contains(haystackLower, needle) {
  const n = String(needle || '').toLowerCase().trim();
  return n.length >= 2 && haystackLower.includes(n);
}

/** Keeps only items whose key text appears in the resume (spec: never invent resume facts). */
function verifyAgainstSource(parsed, text) {
  const lower = text.toLowerCase();
  const strings = arr => (Array.isArray(arr) ? arr.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()) : []);
  const dropped = [];
  const keep = (value, label) => {
    if (contains(lower, value)) return true;
    dropped.push(`${label}: ${value}`);
    return false;
  };
  const skills = Array.from(new Set(strings(parsed.skills).filter(s => keep(s, 'skill'))));
  const projects = (Array.isArray(parsed.projects) ? parsed.projects : [])
    .filter(p => p && typeof p.title === 'string' && keep(p.title, 'project'))
    .map(p => ({
      title: p.title.trim(),
      description: typeof p.description === 'string' ? p.description.trim() : '',
      stack: strings(p.stack).filter(s => contains(lower, s)),
      outcomes: strings(p.outcomes).filter(o => contains(lower, o.slice(0, 40)))
    }));
  const experience = (Array.isArray(parsed.experience) ? parsed.experience : [])
    .filter(e => e && ((typeof e.organization === 'string' && contains(lower, e.organization)) || (typeof e.role === 'string' && contains(lower, e.role))))
    .map(e => ({
      role: String(e.role || '').trim(),
      organization: String(e.organization || '').trim(),
      duration: String(e.duration || '').trim(),
      highlights: strings(e.highlights).filter(h => contains(lower, h.slice(0, 40)))
    }));
  const education = (Array.isArray(parsed.education) ? parsed.education : [])
    .filter(e => e && ((typeof e.institution === 'string' && contains(lower, e.institution)) || (typeof e.degree === 'string' && contains(lower, e.degree))))
    .map(e => ({ degree: String(e.degree || '').trim(), institution: String(e.institution || '').trim(), year: String(e.year || '').trim() }));
  const certifications = strings(parsed.certifications).filter(c => keep(c, 'certification'));
  return { name: typeof parsed.name === 'string' && contains(lower, parsed.name) ? parsed.name.trim() : '', skills, projects, experience, education, certifications, dropped };
}

// Deterministic structure parser used when the generative extractor is unavailable
function ruleBasedStructure(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const sectionOf = line => Object.entries(SECTION_HEADINGS).find(([, rx]) => rx.test(line))?.[0] || null;
  const sections = {};
  let current = null;
  lines.forEach(line => {
    const sec = line.length < 40 ? sectionOf(line) : null;
    if (sec) { current = sec; sections[sec] = []; return; }
    if (current) sections[current].push(line);
  });
  const skills = (sections.skills || []).join(', ').split(/[,|;:]/).map(s => s.replace(/^-\s*/, '').trim()).filter(s => s.length > 1 && s.length < 40);
  const projects = [];
  (sections.projects || []).forEach(line => {
    const isBullet = /^-\s/.test(line);
    if (!isBullet && line.length < 90) projects.push({ title: line.split('|')[0].trim(), description: '', stack: line.includes('|') ? line.split('|').slice(1).join(',').split(',').map(s => s.trim()).filter(Boolean) : [], outcomes: [] });
    else if (projects.length) projects[projects.length - 1].description += `${line.replace(/^-\s*/, '')} `;
  });
  return { name: '', skills, projects: projects.map(p => ({ ...p, description: p.description.trim() })), experience: [], education: [], certifications: [] };
}

async function structuredExtraction(text) {
  const prompt = renderPrompt('resume_parser');
  try {
    let parsed = null;
    const result = await providerFactory.execute('resume_extraction', p => p.generate({
      system: prompt.text,
      prompt: `<resume_text>\n${text.slice(0, 12000)}\n</resume_text>\nReturn only the JSON object.`,
      temperature: 0.1,
      maxTokens: 1500,
      json: true
    }), {
      maxRetries: 1,
      validate: res => {
        parsed = parseModelJson(res.text);
        return Boolean(parsed && (Array.isArray(parsed.skills) || Array.isArray(parsed.projects)));
      }
    });
    return { parsed, method: 'llm', model: result.model, promptVersion: prompt.version };
  } catch (err) {
    return { parsed: ruleBasedStructure(text), method: 'rule-based', model: null, promptVersion: null, warning: err.message };
  }
}

function roleFor(targetRole) {
  const t = String(targetRole || '').toLowerCase();
  return ROLES.find(r => r.title.toLowerCase() === t) || ROLES.find(r => t && r.title.toLowerCase().includes(t.split(' ')[0])) || ROLES[0];
}

// A role skill such as "Java / Python / C++" is satisfied by any of its alternatives
function skillMatches(roleSkill, resumeSkillsLower, textLower) {
  const alternatives = roleSkill.toLowerCase().split(/\s*[/&]\s*|\s+and\s+/).map(s => s.replace(/[()]/g, '').trim()).filter(s => s.length > 1);
  return alternatives.some(a => resumeSkillsLower.some(s => s.includes(a) || a.includes(s)) || textLower.includes(a));
}

async function analyse(text, structured, targetRole) {
  const lower = text.toLowerCase();
  const role = roleFor(targetRole);
  const dims = {};

  const sectionsFound = Object.entries(SECTION_HEADINGS).filter(([, rx]) => rx.test(text)).map(([k]) => k);
  dims.structure = {
    score: Math.round(Math.min(1, sectionsFound.length / 5) * 100),
    explanation: `Detected sections: ${sectionsFound.join(', ') || 'none'}.`,
    recommendations: ['education', 'skills', 'projects', 'experience'].filter(s => !sectionsFound.includes(s)).map(s => `Add a clearly headed "${s}" section.`)
  };

  const resumeSkillsLower = structured.skills.map(s => s.toLowerCase());
  const roleSkills = role.skills || [];
  const matched = roleSkills.filter(s => skillMatches(s, resumeSkillsLower, lower));
  const missingSkills = roleSkills.filter(s => !matched.includes(s));
  dims.skillsAlignment = {
    score: roleSkills.length ? Math.round((matched.length / roleSkills.length) * 100) : 0,
    explanation: `Matches ${matched.length} of ${roleSkills.length} core skills for ${role.title}.`,
    recommendations: missingSkills.slice(0, 3).map(s => `If you have real experience with ${s}, show it in a project or skills entry.`)
  };

  const projectScores = structured.projects.map(p => {
    const body = `${p.title} ${p.description} ${(p.outcomes || []).join(' ')}`;
    return ((p.stack && p.stack.length ? 1 : 0) + (ACTION_VERBS.test(body) ? 1 : 0) + (METRIC.test(body) || (p.outcomes || []).length ? 1 : 0)) / 3;
  });
  dims.projectEvidence = {
    score: projectScores.length ? Math.round((projectScores.reduce((a, b) => a + b, 0) / projectScores.length) * 100) : 0,
    explanation: projectScores.length ? `${structured.projects.length} project(s) found; scored on stack, contribution verbs and measurable outcomes.` : 'No projects found.',
    recommendations: structured.projects.length ? ['State the stack, your specific contribution and a measurable result for each project.'] : ['Add 2-3 projects with stack, your role and outcomes.']
  };

  const expScores = structured.experience.map(e => {
    const body = `${e.role} ${(e.highlights || []).join(' ')}`;
    return ((ACTION_VERBS.test(body) ? 1 : 0) + (METRIC.test(body) ? 1 : 0) + ((e.highlights || []).length >= 2 ? 1 : 0)) / 3;
  });
  dims.experienceEvidence = {
    score: expScores.length ? Math.round((expScores.reduce((a, b) => a + b, 0) / expScores.length) * 100) : 0,
    explanation: expScores.length ? `${structured.experience.length} experience entr${structured.experience.length === 1 ? 'y' : 'ies'}; scored on action + impact + detail.` : 'No internship or work experience found.',
    recommendations: expScores.length ? ['Write each experience bullet as action + technical detail + impact.'] : ['Add internships, freelance or open-source work if you have any.']
  };

  // Semantic role alignment via embeddings (not keyword stuffing)
  const resumeSummary = `${structured.skills.join(', ')}. ${structured.projects.map(p => `${p.title}: ${p.description}`).join(' ')}`.slice(0, 2000);
  const roleSummary = `${role.title}. ${role.description || ''} Skills: ${roleSkills.join(', ')}.`;
  const emb = resumeSummary.trim().length > 20 ? await computeEmbeddingSignals({ question: roleSummary, answer: resumeSummary }) : { available: false, reason: 'not enough resume content' };
  if (emb.available) {
    const sim = emb.questionSimilarity;
    dims.keywordRelevance = {
      score: Math.round(Math.max(0, Math.min(1, (sim - 0.45) / 0.4)) * 100),
      explanation: `Semantic similarity to the ${role.title} profile: ${sim.toFixed(2)} (embedding model ${emb.model}).`,
      recommendations: ['Describe projects in the vocabulary of the target role, without keyword stuffing.']
    };
  } else {
    dims.keywordRelevance = { score: null, explanation: `Not measured: ${emb.reason}`, recommendations: [] };
  }

  const hasContact = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text) && /\+?\d[\d\s-]{8,}/.test(text);
  const parts = [hasContact, structured.education.length > 0 || /education/i.test(text), structured.skills.length > 0, structured.projects.length > 0];
  dims.completeness = {
    score: Math.round((parts.filter(Boolean).length / parts.length) * 100),
    explanation: `Contact details ${hasContact ? 'present' : 'missing'}; education, skills and projects ${parts.slice(1).every(Boolean) ? 'present' : 'partly missing'}.`,
    recommendations: hasContact ? [] : ['Add a professional email and phone number.']
  };

  // Overall: weighted mean over measured dimensions (weights renormalised if one is unavailable)
  const measured = Object.entries(dims).filter(([, d]) => typeof d.score === 'number');
  const weightSum = measured.reduce((n, [k]) => n + ATS_WEIGHTS[k], 0);
  const overall = weightSum ? Math.round(measured.reduce((n, [k, d]) => n + d.score * ATS_WEIGHTS[k], 0) / weightSum) : 0;

  return { role: role.title, dims, overall, matchedSkills: matched, missingSkills };
}

function buildHotspots(structured) {
  const items = [];
  structured.projects.forEach(p => items.push({
    category: 'Project',
    title: p.title,
    detail: p.description || (p.stack.length ? `Built with ${p.stack.join(', ')}.` : ''),
    specificity: (p.stack.length || 0) + (METRIC.test(p.description) ? 2 : 0) + (p.description.length > 60 ? 1 : 0),
    potentialQuestions: [
      `Walk me through how you built ${p.title}${p.stack.length ? ` with ${p.stack.slice(0, 3).join(', ')}` : ''}: what was your exact contribution?`,
      `What was the hardest technical problem in ${p.title}, and how did you solve it?`
    ]
  }));
  structured.experience.forEach(e => items.push({
    category: 'Experience',
    title: `${e.role}${e.organization ? `, ${e.organization}` : ''}`,
    detail: (e.highlights || []).slice(0, 2).map(h => h.trim().replace(/[.;]+$/, '')).join('; '),
    specificity: (e.highlights || []).length + (METRIC.test((e.highlights || []).join(' ')) ? 2 : 0),
    potentialQuestions: [`What did you personally deliver as ${e.role}${e.organization ? ` at ${e.organization}` : ''}?`]
  }));
  structured.certifications.forEach(c => items.push({
    category: 'Skill',
    title: c,
    detail: 'Claimed certification. Interviewers may ask you to prove it.',
    specificity: 1,
    potentialQuestions: [`What did you learn in ${c}, and where have you applied it?`]
  }));
  return items
    .sort((a, b) => b.specificity - a.specificity)
    .slice(0, 8)
    .map((h, i) => ({ id: `hs-${i + 1}`, category: h.category, title: h.title, detail: h.detail, potentialQuestions: h.potentialQuestions }));
}

const DIM_LABELS = {
  structure: 'Structure',
  skillsAlignment: 'Skills Alignment',
  projectEvidence: 'Project Evidence',
  experienceEvidence: 'Experience Evidence',
  keywordRelevance: 'Keyword Relevance',
  completeness: 'Completeness'
};

/**
 * Full pipeline for one stored PDF. Throws a 422 error when no text can be extracted.
 */
async function analyseResumeFile({ filePath, filename, targetRole }) {
  const extraction = await extractText(filePath, filename);
  const readableWords = extraction.text.split(/\s+/).filter(w => /[a-z]{2,}/i.test(w)).length;
  if (readableWords < 30) {
    const err = new Error('Could not read text from this PDF. Scanned/image-only resumes are not supported. Export your resume as a text-based PDF and try again.');
    err.status = 422;
    throw err;
  }
  const extracted = await structuredExtraction(extraction.text);
  const structured = verifyAgainstSource(extracted.parsed || {}, extraction.text);
  const analysis = await analyse(extraction.text, structured, targetRole);
  const hotspots = buildHotspots(structured);
  const wordCount = extraction.text.split(/\s+/).filter(Boolean).length;

  const dimensions = Object.entries(analysis.dims).map(([key, d], i) => ({
    id: `dim-${i + 1}`,
    key,
    name: DIM_LABELS[key],
    score: d.score === null ? 0 : d.score,
    measured: d.score !== null,
    weight: ATS_WEIGHTS[key],
    explanation: d.explanation,
    recommendations: d.recommendations
  }));

  return {
    analysisVersion: ANALYSIS_VERSION,
    extraction: {
      extractor: extraction.extractor,
      structuredBy: extracted.method,
      model: extracted.model,
      promptVersion: extracted.promptVersion,
      pageCount: extraction.pageCount,
      wordCount,
      droppedUnverified: structured.dropped.length,
      warning: extracted.warning || null
    },
    parsed: { name: structured.name, skills: structured.skills, projects: structured.projects, experience: structured.experience, education: structured.education, certifications: structured.certifications, links: extraction.links },
    rawText: extraction.text,
    targetRole: analysis.role,
    atsScore: analysis.overall,
    dimensions,
    hotspots,
    matchedSkills: analysis.matchedSkills,
    missingSkills: analysis.missingSkills,
    recommendations: dimensions.flatMap(d => d.recommendations).slice(0, 6),
    wordCount
  };
}

/** UI payload (shape consumed by the existing resume screens). */
function toDiagnosticPayload(resumeDoc, result) {
  return {
    id: resumeDoc._id.toString(),
    _id: resumeDoc._id.toString(),
    filename: resumeDoc.filename,
    parsedName: resumeDoc.filename.replace(/\.pdf$/i, ''),
    extractedRoles: [result.targetRole],
    targetRole: result.targetRole,
    ats_score: result.atsScore,
    atsScore: result.atsScore,
    overallScore: result.atsScore,
    dimensions: result.dimensions,
    hotspots: result.hotspots,
    detectedKeywords: result.parsed.skills,
    parsedSkills: result.parsed.skills,
    missingKeywords: result.missingSkills,
    matchedSkills: result.matchedSkills,
    recommendations: result.recommendations,
    wordCount: result.wordCount,
    formatCheck: result.atsScore >= 75 ? 'Valid ATS-Friendly' : 'Needs Review',
    parsed: result.parsed,
    extraction: result.extraction,
    analysisVersion: result.analysisVersion,
    created_at: resumeDoc.createdAt
  };
}

module.exports = { ANALYSIS_VERSION, ATS_WEIGHTS, normaliseText, verifyAgainstSource, ruleBasedStructure, analyseResumeFile, toDiagnosticPayload, buildHotspots, skillMatches };
