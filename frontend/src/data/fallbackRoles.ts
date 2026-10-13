import { Role } from '../types/role';

export const FALLBACK_ROLES: Role[] = [
  {
    id: 'role-sde',
    slug: 'software-development-engineer',
    title: 'Software Development Engineer',
    category: 'Software',
    shortDescription: 'Core development role focusing on algorithms, system design, and production coding.',
    fullDescription: 'Software Development Engineers design, develop, and maintain high-performance software systems. Candidates are expected to exhibit deep competence in Data Structures, Algorithms, Object-Oriented Design, and production backend/frontend architectures.',
    salaryRange: '₹8.0 LPA - ₹24.0 LPA',
    difficulty: 'Hard',
    topSkills: ['Data Structures & Algorithms', 'System Design', 'Java / Python / C++', 'SQL & Relational DBs'],
    technicalSkills: [
      { id: 'ts-1', name: 'Data Structures & Algorithms', category: 'Technical', proficiencyRequired: 'Expert', frequencyScore: 98 },
      { id: 'ts-2', name: 'System Design & Scalability', category: 'Technical', proficiencyRequired: 'Advanced', frequencyScore: 92 },
      { id: 'ts-3', name: 'Database Management & SQL', category: 'Technical', proficiencyRequired: 'Advanced', frequencyScore: 88 },
      { id: 'ts-4', name: 'RESTful API Architecture', category: 'Technical', proficiencyRequired: 'Intermediate', frequencyScore: 84 },
      { id: 'ts-5', name: 'Concurrency & Multi-threading', category: 'Technical', proficiencyRequired: 'Advanced', frequencyScore: 80 }
    ],
    softSkills: [
      { id: 'ss-1', name: 'Structured Problem Solving', category: 'Soft', proficiencyRequired: 'Expert' },
      { id: 'ss-2', name: 'STAR Interview Articulation', category: 'Soft', proficiencyRequired: 'Advanced' },
      { id: 'ss-3', name: 'Technical Trade-off Justification', category: 'Soft', proficiencyRequired: 'Advanced' }
    ],
    hiringCompanies: ['Amazon', 'Zoho', 'Infosys', 'Cognizant', 'TCS', 'Freshworks'],
    interviewStructure: [
      { roundNumber: 1, name: 'Online Coding Assessment', description: 'DSA questions + Pseudo-code + Speed & memory benchmarks', evaluates: ['Algorithmic Efficiency', 'Edge Cases'], durationMinutes: 90 },
      { roundNumber: 2, name: 'Technical Deep-Dive', description: 'Live coding, code walkthrough, complexity explanation', evaluates: ['Problem Decomposition', 'Clean Code'], durationMinutes: 60 },
      { roundNumber: 3, name: 'System Design & Architecture', description: 'Design an end-to-end distributed system or module', evaluates: ['Scalability', 'DB Schema', 'Caching'], durationMinutes: 45 },
      { roundNumber: 4, name: 'Techno-Behavioral HR', description: 'Conflict resolution, past failures, company culture alignment', evaluates: ['Cultural Fit', 'Communication'], durationMinutes: 30 }
    ],
    companyPatterns: [
      { companyId: 'amazon', companyName: 'Amazon', roleTitle: 'SDE-1', testFormat: 'HackerRank (2 LeetCode Medium/Hard questions + Work Style Assessment)', sections: ['Coding', 'Work Simulation'], durationMinutes: 90, difficulty: 'Hard', salaryRange: '₹18 - ₹42 LPA' },
      { companyId: 'zoho', companyName: 'Zoho', roleTitle: 'Software Developer', testFormat: 'Basic Programming + Advanced Problem Solving Round (C/Java/Python)', sections: ['Aptitude', 'Basic Code', 'Advanced Code'], durationMinutes: 180, difficulty: 'Hard', salaryRange: '₹6.5 - ₹10 LPA' },
      { companyId: 'tcs', companyName: 'TCS', roleTitle: 'Digital / Prime SDE', testFormat: 'TCS NQT Advanced Cognitive + Advanced Coding', sections: ['Advanced Quantitative', 'Reasoning', 'Hands-on Coding'], durationMinutes: 90, difficulty: 'Medium', salaryRange: '₹7 - ₹9 LPA' }
    ]
  },
  {
    id: 'role-frontend',
    slug: 'frontend-engineer',
    title: 'Frontend Engineer',
    category: 'Software',
    shortDescription: 'Modern web UI specialist building responsive, accessible, high-performance web applications.',
    fullDescription: 'Frontend Engineers craft intuitive user interfaces with modern web standards, state management libraries, and performance optimization techniques.',
    salaryRange: '₹6.0 LPA - ₹18.0 LPA',
    difficulty: 'Medium',
    topSkills: ['React.js / Next.js', 'TypeScript', 'Tailwind CSS', 'Browser Performance & DOM'],
    technicalSkills: [
      { id: 'ts-6', name: 'React.js Architecture & Hooks', category: 'Technical', proficiencyRequired: 'Expert', frequencyScore: 96 },
      { id: 'ts-7', name: 'TypeScript Type-Safety', category: 'Technical', proficiencyRequired: 'Advanced', frequencyScore: 90 },
      { id: 'ts-8', name: 'CSS / Responsive Layouts', category: 'Technical', proficiencyRequired: 'Expert', frequencyScore: 89 },
      { id: 'ts-9', name: 'Web Performance & Web Vitals', category: 'Technical', proficiencyRequired: 'Intermediate', frequencyScore: 82 }
    ],
    softSkills: [
      { id: 'ss-4', name: 'Visual Empathy & UX Focus', category: 'Soft', proficiencyRequired: 'Advanced' },
      { id: 'ss-5', name: 'Cross-functional Collaboration', category: 'Soft', proficiencyRequired: 'Intermediate' }
    ],
    hiringCompanies: ['Freshworks', 'Zoho', 'Accenture', 'Capgemini'],
    interviewStructure: [
      { roundNumber: 1, name: 'Frontend Machine Coding', description: 'Build an interactive component within 90 minutes', evaluates: ['Component Composition', 'State Management'], durationMinutes: 90 },
      { roundNumber: 2, name: 'JavaScript & React Internals', description: 'Event loop, virtual DOM, reconciliation, accessibility', evaluates: ['JS Core Knowledge', 'Web APIs'], durationMinutes: 45 },
      { roundNumber: 3, name: 'Behavioral & Culture Fit', description: 'Design collaboration, team communication', evaluates: ['Teamwork', 'Product Intuition'], durationMinutes: 30 }
    ],
    companyPatterns: [
      { companyId: 'freshworks', companyName: 'Freshworks', roleTitle: 'UI Engineer', testFormat: 'Vanilla JS + React coding + Core Web Architecture', sections: ['JavaScript Essentials', 'Live Component Build'], durationMinutes: 75, difficulty: 'Medium', salaryRange: '₹8 - ₹16 LPA' }
    ]
  },
  {
    id: 'role-data-analyst',
    slug: 'data-analyst',
    title: 'Data Analyst / BI Specialist',
    category: 'Data',
    shortDescription: 'Transforms structured business data into analytical insights, dashboards, and growth metrics.',
    fullDescription: 'Data Analysts work at the intersection of business intelligence and quantitative methods, utilizing SQL, Python, Excel, and visualization suites.',
    salaryRange: '₹5.5 LPA - ₹14.0 LPA',
    difficulty: 'Medium',
    topSkills: ['Advanced SQL & Window Functions', 'Python / Pandas', 'PowerBI / Tableau', 'Statistical Inference'],
    technicalSkills: [
      { id: 'ts-10', name: 'Advanced SQL Querying', category: 'Technical', proficiencyRequired: 'Expert', frequencyScore: 97 },
      { id: 'ts-11', name: 'Exploratory Data Analysis (EDA)', category: 'Technical', proficiencyRequired: 'Advanced', frequencyScore: 90 },
      { id: 'ts-12', name: 'Data Visualization & Storytelling', category: 'Technical', proficiencyRequired: 'Advanced', frequencyScore: 86 }
    ],
    softSkills: [
      { id: 'ss-6', name: 'Executive Storytelling', category: 'Soft', proficiencyRequired: 'Expert' },
      { id: 'ss-7', name: 'Hypothesis Validation', category: 'Soft', proficiencyRequired: 'Advanced' }
    ],
    hiringCompanies: ['Accenture', 'Cognizant', 'Capgemini', 'TCS'],
    interviewStructure: [
      { roundNumber: 1, name: 'Aptitude & SQL Assessment', description: 'Quantitative reasoning + complex SQL queries', evaluates: ['Analytical Speed', 'SQL Mastery'], durationMinutes: 60 },
      { roundNumber: 2, name: 'Case Study & Dashboarding', description: 'Analyze a dataset and present findings to interviewer', evaluates: ['Insight Generation', 'Business Acumen'], durationMinutes: 45 },
      { roundNumber: 3, name: 'HR / Stakeholder Interview', description: 'Discussion on communication and business impact', evaluates: ['Executive Clarity'], durationMinutes: 30 }
    ],
    companyPatterns: [
      { companyId: 'accenture', companyName: 'Accenture', roleTitle: 'Associate Data Analyst', testFormat: 'AMCAT Analytics Assessment + SQL Test', sections: ['Analytical Reasoning', 'SQL', 'Data Interpretation'], durationMinutes: 60, difficulty: 'Medium', salaryRange: '₹5 - ₹9 LPA' }
    ]
  },
  {
    id: 'role-devops',
    slug: 'devops-cloud-engineer',
    title: 'DevOps & Cloud Engineer',
    category: 'Software',
    shortDescription: 'Builds automated CI/CD pipelines, containerized clusters, and resilient cloud architectures.',
    fullDescription: 'DevOps Engineers bridge software development and operations, ensuring rapid release cycles, observability, security, and automated cloud infrastructure.',
    salaryRange: '₹7.0 LPA - ₹19.0 LPA',
    difficulty: 'Hard',
    topSkills: ['Linux & Bash Scripting', 'Docker & Kubernetes', 'AWS / Azure Cloud', 'GitHub Actions / CI-CD'],
    technicalSkills: [
      { id: 'ts-13', name: 'Linux OS Internals & Networking', category: 'Technical', proficiencyRequired: 'Expert', frequencyScore: 95 },
      { id: 'ts-14', name: 'Docker & Containerization', category: 'Technical', proficiencyRequired: 'Expert', frequencyScore: 91 },
      { id: 'ts-15', name: 'CI/CD Pipeline Automation', category: 'Technical', proficiencyRequired: 'Advanced', frequencyScore: 88 }
    ],
    softSkills: [
      { id: 'ss-8', name: 'Incident Communication', category: 'Soft', proficiencyRequired: 'Expert' }
    ],
    hiringCompanies: ['Capgemini', 'Wipro', 'HCL', 'L&T Infotech'],
    interviewStructure: [
      { roundNumber: 1, name: 'Cloud & OS Fundamentals Test', description: 'Linux, networking, bash scripting, cloud architecture', evaluates: ['System Diagnostics'], durationMinutes: 60 },
      { roundNumber: 2, name: 'Practical Infrastructure Round', description: 'Troubleshoot broken deployment or write Dockerfile/CI pipeline', evaluates: ['Practical DevOps Skills'], durationMinutes: 45 }
    ],
    companyPatterns: [
      { companyId: 'capgemini', companyName: 'Capgemini', roleTitle: 'Cloud Associate', testFormat: 'Technical MCQ + Coding + Pseudo Code', sections: ['Pseudo-Code', 'Cloud Basics'], durationMinutes: 60, difficulty: 'Medium', salaryRange: '₹5 - ₹8.5 LPA' }
    ]
  }
];
