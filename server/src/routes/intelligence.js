const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { ROLES, COMPANIES } = require('../seeds/seedData');

const router = express.Router();

// Helper to map a role into full schema
function mapRole(r) {
  const normCat = r.category?.includes('Software')
    ? 'Software'
    : r.category?.includes('Data')
    ? 'Data'
    : r.category?.includes('Management')
    ? 'Management'
    : 'Non-Tech';

  const diff = r.demandLevel === 'Very High' ? 'Hard' : r.demandLevel === 'High' ? 'Medium' : 'Easy';
  const skills = r.skills || [];
  const focus = r.interviewFocus || [];

  return {
    id: r.slug,
    slug: r.slug,
    title: r.title,
    category: normCat,
    rawCategory: r.category,
    salary_range: r.salaryRange,
    salaryRange: r.salaryRange,
    demand_level: r.demandLevel,
    demandLevel: r.demandLevel,
    difficulty: diff,
    shortDescription: r.description || '',
    fullDescription: `${r.description || ''} Key responsibilities include ${(r.responsibilities || []).slice(0, 2).join(' and ')}.`,
    description: r.description || '',
    skills: skills,
    topSkills: skills.slice(0, 4),
    responsibilities: r.responsibilities || [],
    interviewFocus: focus,
    hiringCompanies: ['TCS', 'Infosys', 'Wipro', 'Zoho', 'Amazon', 'Cognizant', 'Accenture', 'HCLTech'],
    technicalSkills: skills.map((s, idx) => ({
      id: `ts-${idx + 1}`,
      name: s,
      category: 'Technical',
      proficiencyRequired: idx < 2 ? 'Expert' : 'Advanced',
      frequencyScore: 92 - idx * 4
    })),
    softSkills: [
      { id: 'ss-1', name: 'Structured Problem Solving', category: 'Soft', proficiencyRequired: 'Expert' },
      { id: 'ss-2', name: 'STAR Interview Articulation', category: 'Soft', proficiencyRequired: 'Advanced' },
      { id: 'ss-3', name: 'Technical Trade-off Justification', category: 'Soft', proficiencyRequired: 'Advanced' }
    ],
    interviewStructure: focus.length > 0 ? focus.map((f, idx) => ({
      roundNumber: idx + 1,
      name: `Round ${idx + 1}: ${f.split('(')[0].trim()}`,
      description: f,
      evaluates: [f.split('(')[0].trim(), 'Problem Solving', 'Communication'],
      durationMinutes: idx === 0 ? 60 : 45
    })) : [
      { roundNumber: 1, name: 'Round 1: Online Assessment', description: 'Cognitive & Technical Speed MCQs', evaluates: ['Aptitude', 'Core CS'], durationMinutes: 60 },
      { roundNumber: 2, name: 'Round 2: Technical Deep Dive', description: 'Live coding & architecture discussion', evaluates: ['DSA', 'System Design'], durationMinutes: 45 },
      { roundNumber: 3, name: 'Round 3: Behavioral & HR', description: 'STAR project review & culture fit', evaluates: ['STAR', 'Communication'], durationMinutes: 30 }
    ],
    companyPatterns: [
      { companyId: 'tcs', companyName: 'TCS', roleTitle: r.title, testFormat: 'NQT Foundation + Advanced Section', sections: ['Numerical', 'Reasoning', 'Technical Coding'], durationMinutes: 120, difficulty: 'Medium', salaryRange: r.salaryRange },
      { companyId: 'infosys', companyName: 'Infosys', roleTitle: r.title, testFormat: 'Online Test + InfyTQ Technical', sections: ['Pseudo-Code', 'Reasoning', 'Hands-on Coding'], durationMinutes: 100, difficulty: 'Hard', salaryRange: r.salaryRange },
      { companyId: 'zoho', companyName: 'Zoho', roleTitle: r.title, testFormat: 'Multi-stage Practical Coding Challenge', sections: ['Basic Programming', 'Advanced Problem Solving'], durationMinutes: 180, difficulty: 'Hard', salaryRange: r.salaryRange }
    ]
  };
}

// Helper to map a company into full schema
const PATTERN_DATA_VERSION = '2026.1';

function patternMetaFor(c) {
  return {
    version: PATTERN_DATA_VERSION,
    source: c.assessmentPattern ? 'PrepAI curated pattern dataset' : 'Generic placement-test template (no company-specific data)',
    verifiedAt: c.patternVerifiedAt || null,
    confidence: c.assessmentPattern ? (c.patternVerifiedAt ? 'high' : 'medium') : 'low',
    note: "Patterns are versioned estimates. Confirm against the company's official drive notification before the test."
  };
}

function mapCompany(c) {
  const p = c.assessmentPattern || {
    totalQuestions: 60,
    totalMinutes: 90,
    totalSections: 3,
    sections: [
      { name: 'Quantitative & Analytical', questions: 25, durationMinutes: 35, topics: ['Algebra', 'Percentages', 'Series'] },
      { name: 'Verbal & Communication', questions: 20, durationMinutes: 25, topics: ['Grammar', 'Comprehension'] },
      { name: 'Technical & Coding', questions: 15, durationMinutes: 30, topics: ['Algorithms', 'Data Structures'] }
    ]
  };

  const tier = c.category?.includes('Consulting') || c.category?.includes('IT Services')
    ? 'IT Giant'
    : c.slug === 'amazon' || c.slug === 'zoho' || c.slug === 'freshworks'
    ? 'Tier-1 Product'
    : 'High-Growth Tech';

  return {
    id: c.slug,
    slug: c.slug,
    name: c.name,
    category: c.category,
    tier: tier,
    // Company patterns change every season: expose provenance instead of presenting them as fact (spec §12.2)
    patternMeta: patternMetaFor(c),
    ctc_range: c.ctcRange,
    ctcRange: c.ctcRange,
    averagePackage: c.ctcRange,
    status: c.status,
    description: c.description,
    hiringOverview: c.description,
    testFormat: `${c.name} Comprehensive Campus Assessment Pattern`,
    rolesHired: ['Software Developer (SDE)', 'Systems Engineer', 'Cloud / DevOps Associate', 'Data Analyst'],
    totalQuestions: p.totalQuestions || 60,
    totalDurationMinutes: p.totalMinutes || 90,
    difficulty: p.difficultyDistribution?.hard > 15 ? 'Hard' : 'Medium',
    sections: (p.sections || []).map(s => ({
      name: s.name,
      questionCount: s.questions,
      timeLimitMinutes: s.durationMinutes,
      topics: s.topics || ['Foundations', 'Advanced Concepts']
    })),
    interviewProcess: [
      `${c.name} Online Screening Assessment`,
      'Technical Evaluation (Round 1: DSA & Core CS)',
      'Managerial & System Architecture (Round 2)',
      'HR Behavioral & Cultural Alignment'
    ],
    keyPreparationTips: [
      `Strict sectional time limits apply on ${c.name} tests. Practice paced problem-solving.`,
      'All coding questions test clean syntax, boundary conditions, and edge-case handling.',
      'Prepare 2 strong project walkthroughs following the STAR framework for panel rounds.'
    ],
    assessmentPattern: p
  };
}

// GET /roles
router.get('/roles', (req, res) => {
  res.json(ROLES.map(mapRole));
});

// GET /roles/:slug
router.get('/roles/:slug', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const role = ROLES.find(r => r.slug === slug || r.slug.includes(slug) || slug.includes(r.slug));
  if (!role) {
    return res.status(404).json({ detail: `Role '${slug}' not found` });
  }
  res.json(mapRole(role));
});

// GET /companies
router.get('/companies', (req, res) => {
  res.json(COMPANIES.map(mapCompany));
});

// GET /companies/:slug
router.get('/companies/:slug', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const company = COMPANIES.find(
    c => c.slug === slug ||
         (slug === 'hcl' && c.slug === 'hcltech') ||
         ((slug === 'lt-infotech' || slug === 'lti' || slug === 'l-and-t-infotech') && c.slug === 'ltimindtree')
  );
  if (!company) {
    return res.status(404).json({ detail: `Company '${slug}' not found` });
  }
  res.json(mapCompany(company));
});

// GET /companies/:slug/pattern
router.get('/companies/:slug/pattern', (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const company = COMPANIES.find(
    c => c.slug === slug ||
         (slug === 'hcl' && c.slug === 'hcltech') ||
         ((slug === 'lt-infotech' || slug === 'lti' || slug === 'l-and-t-infotech') && c.slug === 'ltimindtree')
  );
  if (!company) {
    return res.status(404).json({ detail: `Company pattern '${slug}' not found` });
  }

  const p = company.assessmentPattern;
  res.json({
    slug: company.slug,
    name: company.name,
    industry: company.category,
    hiring_signal: company.status,
    salary_range: company.ctcRange,
    assessment_summary: company.description,
    description: company.description,
    sections: p.sections.map(s => ({
      name: s.name,
      questions: s.questions,
      duration_minutes: s.durationMinutes,
      topics: s.topics
    })),
    timings: {
      total_minutes: p.totalMinutes,
      sectional_cutoff: p.sectionalCutoff
    },
    distribution: p.difficultyDistribution || {
      easy: 35,
      medium: 50,
      hard: 15
    },
    negative_marking: {
      rules: p.negativeMarking || 'none'
    },
    pattern: p
  });
});

// POST /presentation — Generate interactive placement strategy slides
router.post('/presentation', (req, res) => {
  const { role_slug, company_slug } = req.body;
  const company = COMPANIES.find(c => c.slug === (company_slug || 'tcs')) || COMPANIES[0];
  const role = ROLES.find(r => r.slug === (role_slug || 'software-developer-sde')) || ROLES[0];

  const slides = [
    {
      slideNumber: 1,
      title: `${company.name} Campus Placement Blueprint`,
      subtitle: `Target Role: ${role.title} · Benchmark CTC: ${company.ctcRange}`,
      badge: 'Executive Strategy',
      bullets: [
        `Company Domain: ${company.category}`,
        `Assessment Type: ${company.description.split(':')[0] || 'National Campus Drive'}`,
        `Estimated Hiring Target: 2026 Batch Graduates`,
        `Role Demand: ${role.demandLevel} Demand across Indian Engineering centers`
      ],
      keyTakeaway: 'Mastering the first-round elimination pattern is 80% of the battle for Indian IT leaders.'
    },
    {
      slideNumber: 2,
      title: 'Assessment Structure & Round Analysis',
      subtitle: `Total Duration: ${company.assessmentPattern.totalMinutes} Minutes · ${company.assessmentPattern.totalSections} Core Sections`,
      badge: 'Test Breakdown',
      bullets: company.assessmentPattern.sections.map(
        s => `${s.name}: ${s.questions} Questions (${s.durationMinutes} mins). High-yield topics: ${s.topics.join(', ')}`
      ),
      keyTakeaway: `Sectional Cutoff: ${company.assessmentPattern.sectionalCutoff.toUpperCase()} · Negative Marking: ${company.assessmentPattern.negativeMarking}`
    },
    {
      slideNumber: 3,
      title: 'Technical Competency & Skill Matrix',
      subtitle: `Core Skills Demanded for ${role.title}`,
      badge: 'Skill Taxonomy',
      bullets: [
        `Primary Languages & Frameworks: ${(role.skills || []).slice(0, 3).join(', ')}`,
        `System Architecture & CS Fundamentals: ${(role.skills || []).slice(3).join(', ')}`,
        `Key Responsibility: ${role.responsibilities?.[0] || 'Scalable application engineering'}`,
        `Code Quality Standards: DRY, Clean Architecture, and Algorithmic Space-Time Optimization`
      ],
      keyTakeaway: 'Interviewers in technical rounds assess how you think out loud and handle edge cases.'
    },
    {
      slideNumber: 4,
      title: '4-Week Preparation Sprint Roadmap',
      subtitle: 'Structured 30-Day Accelerated Placement Plan',
      badge: 'Execution Plan',
      bullets: [
        'Week 1: Quantitative speed drills, Permutations, Percentages, and Array manipulation',
        'Week 2: Binary Search, Hashing, Recursion, and Tree data structures',
        'Week 3: Core CS MCQs (OS Deadlocks, SQL Queries, OOP) + Pseudo Code debugging',
        'Week 4: Timed full-length company mock tests, STAR behavioral stories, and resume alignment'
      ],
      keyTakeaway: 'Consistent 90-minute daily practice improves aptitude speed by over 45%.'
    },
    {
      slideNumber: 5,
      title: 'Interview Day Strategy & STAR Methodology',
      subtitle: 'Cracking the Technical & HR Panel Rounds',
      badge: 'Interview Mastery',
      bullets: [
        'Situation: Set context concisely within 30 seconds',
        'Task: Clearly define the engineering challenge and constraints',
        'Action: Emphasize YOUR specific contributions using active technical verbs',
        'Result: Always quantify outcomes (e.g. reduced latency by 30%, served 10k users)'
      ],
      keyTakeaway: 'Every project bullet on your resume is fair game for 15 minutes of deep technical scrutiny.'
    },
    {
      slideNumber: 6,
      title: 'Readiness Checklist & Final Recommendations',
      subtitle: 'PrepAI Placement Launch Criteria',
      badge: 'Milestone Targets',
      bullets: [
        'Target Aptitude Benchmark: ≥ 75% accuracy with under 75s per question',
        'Target Mock Interview Score: ≥ 80% across 7 Rubric Dimensions',
        'Resume ATS Compatibility: ≥ 85% keyword alignment',
        'Daily Streak Goal: Minimum 14-day unbroken study streak prior to recruitment day'
      ],
      keyTakeaway: 'Your PrepAI placement readiness index updates automatically after every practice session.'
    }
  ];

  res.json({
    id: uuidv4(),
    company: company.name,
    companySlug: company.slug,
    role: role.title,
    roleSlug: role.slug,
    totalSlides: slides.length,
    slides,
    generatedAt: new Date().toISOString()
  });
});

// POST /skill-gap/analyze — readiness and a study plan computed from the student's own skill ratings
const RATING_POINTS = { strong: 100, okay: 60, weak: 20 };

router.post('/skill-gap/analyze', (req, res) => {
  const { roleSlug, skillRatings } = req.body || {};
  const role = ROLES.find(r => r.slug === roleSlug);
  if (!role) {
    return res.status(404).json({ detail: 'Role not found' });
  }
  if (!skillRatings || typeof skillRatings !== 'object') {
    return res.status(400).json({ detail: 'skillRatings is required' });
  }

  // Score the role's skills the student actually rated; nothing unrated is assumed weak
  const ratings = (role.skills || [])
    .filter(skill => RATING_POINTS[skillRatings[skill]] !== undefined)
    .map(skill => ({ skill, rating: skillRatings[skill] }));
  if (!ratings.length) {
    return res.status(400).json({ detail: `Rate at least one ${role.title} skill` });
  }
  const overallReadiness = Math.round(ratings.reduce((sum, r) => sum + RATING_POINTS[r.rating], 0) / ratings.length);

  const strengths = ratings.filter(r => r.rating === 'strong').map(r => r.skill);
  const weaknesses = ratings.filter(r => r.rating === 'weak').map(r => r.skill);
  const okay = ratings.filter(r => r.rating === 'okay').map(r => r.skill);

  // Weak skills first (two sessions each), then "okay" skills (one review session each)
  const planTopics = [
    ...weaknesses.flatMap(s => [
      { topic: `${s}: fundamentals`, description: `Learn the core concepts of ${s} and solve 5 beginner problems.`, minutes: 60 },
      { topic: `${s}: interview practice`, description: `Practice common ${role.title} interview questions on ${s} and explain answers out loud.`, minutes: 45 }
    ]),
    ...okay.map(s => ({ topic: `${s}: revision`, description: `Revise ${s} and attempt 3 medium-difficulty problems.`, minutes: 40 }))
  ];
  (role.interviewFocus || []).slice(0, 2).forEach(f => planTopics.push({
    topic: `Mock round: ${f}`,
    description: `Take a mock interview focused on ${f} and review the feedback report.`,
    minutes: 30
  }));

  res.json({
    roleTitle: role.title,
    overallReadiness,
    strengths,
    weaknesses,
    generatedStudyPlan: planTopics.map((t, i) => ({
      id: `sp-${i + 1}`,
      dayNumber: i + 1,
      topic: t.topic,
      description: t.description,
      estimatedMinutes: t.minutes,
      isCompleted: false
    }))
  });
});

module.exports = router;
