import type { Role } from './types';

const engineeringRounds = [
  { name: 'Online assessment', duration: '60–90 min', focus: 'Problem solving, aptitude, and coding fundamentals.' },
  { name: 'Technical deep-dive', duration: '45 min', focus: 'Projects, core CS, and practical trade-offs.' },
  { name: 'Hiring conversation', duration: '30 min', focus: 'Ownership, communication, and role motivation.' },
];

const productRounds = [
  { name: 'Case or aptitude round', duration: '45–75 min', focus: 'Structured thinking and numerical judgement.' },
  { name: 'Functional interview', duration: '45 min', focus: 'Frameworks, projects, and collaboration.' },
  { name: 'Stakeholder conversation', duration: '30 min', focus: 'Clarity, judgement, and values alignment.' },
];

function skills(...items: Array<[string, 'essential' | 'important' | 'useful', string]>) {
  return items.map(([name, priority, description]) => ({ name, priority, description }));
}

export const roles: Role[] = [
  {
    id: 'role-sde', slug: 'software-development-engineer', title: 'Software Development Engineer', category: 'Core Software Engineering', salaryRange: '₹6–18 LPA', difficulty: 'Advanced',
    description: 'Build dependable product systems and explain the reasoning behind your technical choices.', skills: ['DSA', 'OOP', 'DBMS', 'System Design'],
    requiredSkills: skills(['Data structures & algorithms', 'essential', 'Solve common patterns with clear complexity analysis.'], ['Object-oriented design', 'essential', 'Model maintainable classes and responsibilities.'], ['DBMS & SQL', 'important', 'Design queries and explain transactions.'], ['System design', 'important', 'Reason about scalable services at fresher depth.'], ['Communication', 'important', 'Narrate decisions while you solve.']),
    interviewRounds: engineeringRounds, companySlugs: ['amazon', 'tcs', 'infosys', 'zoho', 'freshworks'], hiringSignal: 'High demand across product and services teams', updatedAt: '2026-08-10T09:00:00.000Z',
  },
  {
    id: 'role-frontend', slug: 'frontend-developer', title: 'Frontend Developer', category: 'Core Software Engineering', salaryRange: '₹5–14 LPA', difficulty: 'Growing',
    description: 'Turn product intent into fast, accessible interfaces with strong engineering judgement.', skills: ['React', 'JavaScript', 'CSS', 'Web performance'],
    requiredSkills: skills(['JavaScript & TypeScript', 'essential', 'Use modern language features confidently.'], ['React architecture', 'essential', 'Compose resilient, maintainable UI state.'], ['CSS & responsive design', 'essential', 'Build accessible layouts across devices.'], ['Web performance', 'important', 'Measure and improve loading and interaction.'], ['API integration', 'important', 'Handle loading, error, and empty states.']),
    interviewRounds: engineeringRounds, companySlugs: ['amazon', 'zoho', 'freshworks', 'tcs'], hiringSignal: 'Portfolio quality carries unusual weight', updatedAt: '2026-08-11T09:00:00.000Z',
  },
  {
    id: 'role-backend', slug: 'backend-developer', title: 'Backend Developer', category: 'Core Software Engineering', salaryRange: '₹6–16 LPA', difficulty: 'Advanced',
    description: 'Design secure APIs, dependable data flows, and services that scale predictably.', skills: ['APIs', 'Databases', 'Caching', 'Security'],
    requiredSkills: skills(['API design', 'essential', 'Explain contracts, validation, and error handling.'], ['Databases', 'essential', 'Model data and optimize practical queries.'], ['Backend language', 'essential', 'Write readable, testable application code.'], ['Security basics', 'important', 'Protect identity, input, and service boundaries.'], ['Caching & queues', 'useful', 'Recognize latency and throughput trade-offs.']),
    interviewRounds: engineeringRounds, companySlugs: ['amazon', 'zoho', 'freshworks', 'infosys'], hiringSignal: 'Strong fundamentals unlock platform teams', updatedAt: '2026-08-12T09:00:00.000Z',
  },
  {
    id: 'role-fullstack', slug: 'full-stack-developer', title: 'Full Stack Developer', category: 'Core Software Engineering', salaryRange: '₹6–15 LPA', difficulty: 'Advanced',
    description: 'Own a complete product slice, from interface behaviour through data and deployment.', skills: ['React', 'Node.js', 'SQL', 'Testing'],
    requiredSkills: skills(['Frontend systems', 'essential', 'Build accessible, stateful interface flows.'], ['Server-side APIs', 'essential', 'Design data contracts and business logic.'], ['Database modelling', 'important', 'Choose sensible schemas and indexes.'], ['Testing', 'important', 'Protect critical flows with useful tests.'], ['Deployment basics', 'useful', 'Describe how work reaches production.']),
    interviewRounds: engineeringRounds, companySlugs: ['zoho', 'freshworks', 'tcs', 'capgemini'], hiringSignal: 'Best fit for evidence-rich project stories', updatedAt: '2026-08-12T09:00:00.000Z',
  },
  {
    id: 'role-mobile', slug: 'mobile-developer', title: 'Mobile Developer', category: 'Core Software Engineering', salaryRange: '₹5–13 LPA', difficulty: 'Growing',
    description: 'Create reliable Android or iOS experiences that feel native and performant.', skills: ['Kotlin / Swift', 'UI state', 'Networking', 'Debugging'],
    requiredSkills: skills(['Mobile platform basics', 'essential', 'Understand lifecycle, storage, and navigation.'], ['UI composition', 'essential', 'Create responsive native interfaces.'], ['Networking', 'important', 'Integrate APIs under intermittent connectivity.'], ['Performance', 'important', 'Profile frame, memory, and battery impact.'], ['Release process', 'useful', 'Explain signing and app-store delivery.']),
    interviewRounds: engineeringRounds, companySlugs: ['amazon', 'freshworks', 'tcs'], hiringSignal: 'Platform-specific projects stand out', updatedAt: '2026-08-09T09:00:00.000Z',
  },
  {
    id: 'role-devops', slug: 'devops-engineer', title: 'DevOps Engineer', category: 'DevOps & Cloud', salaryRange: '₹6–15 LPA', difficulty: 'Advanced',
    description: 'Make software delivery reliable through automation, observability, and practical cloud fluency.', skills: ['Linux', 'CI/CD', 'Docker', 'Cloud'],
    requiredSkills: skills(['Linux fundamentals', 'essential', 'Diagnose systems with confidence.'], ['CI/CD', 'essential', 'Design safe, repeatable release workflows.'], ['Containers', 'essential', 'Package and run applications predictably.'], ['Cloud services', 'important', 'Select managed building blocks thoughtfully.'], ['Observability', 'important', 'Use logs, metrics, and traces to act.']),
    interviewRounds: engineeringRounds, companySlugs: ['amazon', 'tcs', 'accenture', 'capgemini'], hiringSignal: 'Automation and troubleshooting are heavily tested', updatedAt: '2026-08-08T09:00:00.000Z',
  },
  {
    id: 'role-cloud', slug: 'cloud-engineer', title: 'Cloud Engineer', category: 'DevOps & Cloud', salaryRange: '₹6–14 LPA', difficulty: 'Growing',
    description: 'Design cost-aware cloud environments with secure identity and networking foundations.', skills: ['AWS / GCP', 'Networking', 'IAM', 'Terraform'],
    requiredSkills: skills(['Cloud fundamentals', 'essential', 'Choose compute, storage, and databases appropriately.'], ['Networking', 'essential', 'Explain VPCs, DNS, and load balancing.'], ['Identity & access', 'important', 'Apply least privilege in realistic scenarios.'], ['Infrastructure as code', 'important', 'Version and review infrastructure safely.'], ['Cost awareness', 'useful', 'Balance performance with operating spend.']),
    interviewRounds: engineeringRounds, companySlugs: ['amazon', 'accenture', 'tcs', 'ltimindtree'], hiringSignal: 'Certification knowledge helps only with practical examples', updatedAt: '2026-08-08T09:00:00.000Z',
  },
  {
    id: 'role-sre', slug: 'site-reliability-engineer', title: 'Site Reliability Engineer', category: 'DevOps & Cloud', salaryRange: '₹8–18 LPA', difficulty: 'Advanced',
    description: 'Protect service reliability by applying engineering discipline to operational work.', skills: ['Reliability', 'Linux', 'Monitoring', 'Incident response'],
    requiredSkills: skills(['Systems thinking', 'essential', 'Trace failures across service dependencies.'], ['SLIs & SLOs', 'essential', 'Define useful reliability targets.'], ['Monitoring', 'important', 'Turn signal into actionable alerts.'], ['Incident response', 'important', 'Communicate clearly during failure.'], ['Automation', 'important', 'Eliminate recurring manual toil.']),
    interviewRounds: engineeringRounds, companySlugs: ['amazon', 'freshworks', 'zoho'], hiringSignal: 'Calm incident reasoning is a differentiator', updatedAt: '2026-08-10T09:00:00.000Z',
  },
  {
    id: 'role-data-analyst', slug: 'data-analyst', title: 'Data Analyst', category: 'Data & AI', salaryRange: '₹5–12 LPA', difficulty: 'Growing',
    description: 'Turn ambiguous data into a clear decision story that stakeholders can trust.', skills: ['SQL', 'Python', 'Power BI', 'Statistics'],
    requiredSkills: skills(['SQL', 'essential', 'Write joins, windows, and clear analytical queries.'], ['Statistics', 'essential', 'Interpret variance, significance, and bias.'], ['Spreadsheets / BI', 'important', 'Build decision-ready reports.'], ['Python analysis', 'important', 'Clean and explore data reproducibly.'], ['Storytelling', 'essential', 'Make the recommendation obvious.']),
    interviewRounds: productRounds, companySlugs: ['amazon', 'tcs', 'infosys', 'accenture'], hiringSignal: 'Case communication matters as much as SQL', updatedAt: '2026-08-11T09:00:00.000Z',
  },
  {
    id: 'role-data-scientist', slug: 'data-scientist', title: 'Data Scientist', category: 'Data & AI', salaryRange: '₹8–18 LPA', difficulty: 'Advanced',
    description: 'Frame data problems, validate models, and communicate their real-world limitations.', skills: ['Python', 'Statistics', 'Machine learning', 'Experimentation'],
    requiredSkills: skills(['Statistical inference', 'essential', 'Reason about uncertainty and experiments.'], ['Python', 'essential', 'Work fluently with data workflows.'], ['Machine learning', 'essential', 'Select and validate baseline models.'], ['Feature engineering', 'important', 'Translate domain signal into model inputs.'], ['Communication', 'important', 'Explain limitations without overclaiming.']),
    interviewRounds: engineeringRounds, companySlugs: ['amazon', 'freshworks', 'infosys'], hiringSignal: 'A rigorous project explanation wins', updatedAt: '2026-08-10T09:00:00.000Z',
  },
  {
    id: 'role-ml', slug: 'machine-learning-engineer', title: 'Machine Learning Engineer', category: 'Data & AI', salaryRange: '₹10–20 LPA', difficulty: 'Advanced',
    description: 'Ship machine learning systems with the engineering discipline production workloads require.', skills: ['Python', 'ML', 'MLOps', 'System design'],
    requiredSkills: skills(['ML foundations', 'essential', 'Explain models, evaluation, and trade-offs.'], ['Software engineering', 'essential', 'Write maintainable, tested production code.'], ['MLOps', 'important', 'Track data, models, and deployment safely.'], ['Data pipelines', 'important', 'Protect quality from source to feature.'], ['System design', 'important', 'Scale inference and monitoring.']),
    interviewRounds: engineeringRounds, companySlugs: ['amazon', 'freshworks', 'zoho'], hiringSignal: 'Production thinking separates candidates', updatedAt: '2026-08-12T09:00:00.000Z',
  },
  {
    id: 'role-bi', slug: 'business-intelligence-analyst', title: 'Business Intelligence Analyst', category: 'Data & AI', salaryRange: '₹5–11 LPA', difficulty: 'Foundation',
    description: 'Build trusted reporting systems and turn operational numbers into useful decisions.', skills: ['SQL', 'Data modelling', 'Power BI', 'Business context'],
    requiredSkills: skills(['SQL', 'essential', 'Transform source data into reliable views.'], ['Data modelling', 'important', 'Design clean facts and dimensions.'], ['Dashboard design', 'important', 'Prioritize signal over visual noise.'], ['Business fluency', 'essential', 'Connect metrics to practical decisions.'], ['Quality checks', 'important', 'Catch broken or misleading data.']),
    interviewRounds: productRounds, companySlugs: ['tcs', 'infosys', 'accenture'], hiringSignal: 'Portfolio dashboards should answer a business question', updatedAt: '2026-08-09T09:00:00.000Z',
  },
  {
    id: 'role-product-manager', slug: 'product-manager', title: 'Product Manager', category: 'Product & Business', salaryRange: '₹8–18 LPA', difficulty: 'Advanced',
    description: 'Navigate customer, business, and engineering constraints to make good product calls.', skills: ['Product sense', 'Analytics', 'Strategy', 'Communication'],
    requiredSkills: skills(['Product sense', 'essential', 'Identify users, problems, and priorities.'], ['Analytics', 'important', 'Use evidence to inspect product behaviour.'], ['Structured communication', 'essential', 'Make decisions legible to a group.'], ['Technical fluency', 'important', 'Partner effectively with engineering.'], ['Execution', 'important', 'Break ambiguous work into outcomes.']),
    interviewRounds: productRounds, companySlugs: ['amazon', 'freshworks', 'zoho'], hiringSignal: 'Clear frameworks beat memorized answers', updatedAt: '2026-08-12T09:00:00.000Z',
  },
  {
    id: 'role-business-analyst', slug: 'business-analyst', title: 'Business Analyst', category: 'Product & Business', salaryRange: '₹5–12 LPA', difficulty: 'Growing',
    description: 'Translate stakeholder needs into structured requirements, analysis, and delivery clarity.', skills: ['Requirements', 'SQL', 'Process mapping', 'Communication'],
    requiredSkills: skills(['Requirements analysis', 'essential', 'Turn conversation into precise work.'], ['Process mapping', 'important', 'Spot bottlenecks and hand-offs.'], ['SQL & analysis', 'important', 'Validate business questions with data.'], ['Stakeholder communication', 'essential', 'Clarify decisions and open questions.'], ['Documentation', 'important', 'Keep teams aligned with useful artefacts.']),
    interviewRounds: productRounds, companySlugs: ['tcs', 'infosys', 'accenture', 'cognizant'], hiringSignal: 'Scenario questions are common', updatedAt: '2026-08-09T09:00:00.000Z',
  },
  {
    id: 'role-project-manager', slug: 'project-manager', title: 'Project Manager', category: 'Product & Business', salaryRange: '₹6–13 LPA', difficulty: 'Growing',
    description: 'Keep cross-functional delivery predictable while surfacing risk early and clearly.', skills: ['Planning', 'Agile', 'Risk management', 'Stakeholders'],
    requiredSkills: skills(['Planning', 'essential', 'Make scope, timeline, and dependencies visible.'], ['Agile practice', 'important', 'Use rituals to improve delivery, not perform process.'], ['Risk management', 'essential', 'Identify and mitigate delivery risk.'], ['Stakeholder management', 'essential', 'Set credible expectations.'], ['Metrics', 'useful', 'Use simple indicators to steer work.']),
    interviewRounds: productRounds, companySlugs: ['tcs', 'infosys', 'capgemini', 'ltimindtree'], hiringSignal: 'Situation-action-result stories are essential', updatedAt: '2026-08-08T09:00:00.000Z',
  },
  {
    id: 'role-scrum-master', slug: 'scrum-master', title: 'Scrum Master', category: 'Product & Business', salaryRange: '₹5–11 LPA', difficulty: 'Growing',
    description: 'Help teams improve flow, remove blockers, and work with disciplined transparency.', skills: ['Scrum', 'Facilitation', 'Coaching', 'Delivery metrics'],
    requiredSkills: skills(['Scrum values', 'essential', 'Explain why each practice exists.'], ['Facilitation', 'essential', 'Create useful, inclusive team discussions.'], ['Coaching', 'important', 'Guide without taking ownership away.'], ['Flow metrics', 'important', 'Use data to improve systems.'], ['Conflict resolution', 'important', 'Move disagreement toward action.']),
    interviewRounds: productRounds, companySlugs: ['infosys', 'accenture', 'capgemini'], hiringSignal: 'Practical facilitation stories are compelling', updatedAt: '2026-08-10T09:00:00.000Z',
  },
  {
    id: 'role-qa', slug: 'qa-engineer', title: 'QA Engineer', category: 'Quality & Security', salaryRange: '₹4.5–10 LPA', difficulty: 'Growing',
    description: 'Protect customer trust by designing useful tests and collaborating early with delivery teams.', skills: ['Test design', 'Automation', 'APIs', 'Debugging'],
    requiredSkills: skills(['Test design', 'essential', 'Create high-value test coverage from requirements.'], ['Bug analysis', 'essential', 'Isolate, explain, and prioritize failures.'], ['Automation', 'important', 'Write maintainable browser or API checks.'], ['API testing', 'important', 'Validate contracts and failure modes.'], ['Quality mindset', 'essential', 'Advocate for risk-based decisions.']),
    interviewRounds: engineeringRounds, companySlugs: ['tcs', 'cognizant', 'capgemini', 'hexaware'], hiringSignal: 'Test cases are usually evaluated live', updatedAt: '2026-08-11T09:00:00.000Z',
  },
  {
    id: 'role-cybersecurity', slug: 'cybersecurity-analyst', title: 'Cybersecurity Analyst', category: 'Quality & Security', salaryRange: '₹7–16 LPA', difficulty: 'Advanced',
    description: 'Find, prioritize, and communicate security risk across systems and operational workflows.', skills: ['Networking', 'Linux', 'Threat modelling', 'Security tools'],
    requiredSkills: skills(['Networking', 'essential', 'Understand protocols and attack surfaces.'], ['Linux', 'essential', 'Investigate hosts and permissions.'], ['Threat modelling', 'important', 'Identify security assumptions and controls.'], ['Security monitoring', 'important', 'Triage alerts with sound judgement.'], ['Risk communication', 'essential', 'Explain impact clearly to non-specialists.']),
    interviewRounds: engineeringRounds, companySlugs: ['amazon', 'tcs', 'accenture'], hiringSignal: 'Ethical, methodical reasoning matters', updatedAt: '2026-08-10T09:00:00.000Z',
  },
  {
    id: 'role-embedded', slug: 'embedded-systems-engineer', title: 'Embedded Systems Engineer', category: 'Quality & Security', salaryRange: '₹6–14 LPA', difficulty: 'Advanced',
    description: 'Write resource-aware software that interfaces safely with real hardware.', skills: ['C/C++', 'Microcontrollers', 'RTOS', 'Debugging'],
    requiredSkills: skills(['C/C++', 'essential', 'Write safe, efficient low-level code.'], ['Microcontrollers', 'essential', 'Understand peripherals and constraints.'], ['RTOS basics', 'important', 'Reason about scheduling and concurrency.'], ['Hardware interfaces', 'important', 'Work with common protocols.'], ['Debugging', 'essential', 'Use signals and tools methodically.']),
    interviewRounds: engineeringRounds, companySlugs: ['tcs', 'infosys', 'ltimindtree'], hiringSignal: 'Core fundamentals are tested deeply', updatedAt: '2026-08-08T09:00:00.000Z',
  },
  {
    id: 'role-uiux', slug: 'ui-ux-designer', title: 'UI/UX Designer', category: 'Design & Non-Tech', salaryRange: '₹5–12 LPA', difficulty: 'Growing',
    description: 'Make user needs visible through thoughtful research, interaction design, and clear rationale.', skills: ['Research', 'Interaction design', 'Figma', 'Usability'],
    requiredSkills: skills(['User research', 'essential', 'Plan and synthesize useful discovery.'], ['Interaction design', 'essential', 'Create flows that reduce friction.'], ['Visual hierarchy', 'important', 'Use typography and layout intentionally.'], ['Prototyping', 'important', 'Test ideas before building.'], ['Design critique', 'essential', 'Explain choices and incorporate feedback.']),
    interviewRounds: productRounds, companySlugs: ['amazon', 'zoho', 'freshworks'], hiringSignal: 'Case-study narrative is the interview', updatedAt: '2026-08-11T09:00:00.000Z',
  },
];

export const roleCategories = Array.from(new Set(roles.map((role) => role.category)));
