import { Company } from '../types/company';

export const FALLBACK_COMPANIES: Company[] = [
  {
    id: 'tcs',
    slug: 'tcs',
    name: 'TCS (Tata Consultancy Services)',
    tier: 'IT Giant',
    rolesHired: ['Ninja (3.6 LPA)', 'Digital (7.0 LPA)', 'Prime (9.0 - 11.5 LPA)'],
    testFormat: 'TCS National Qualifier Test (NQT) - Online Test Platform',
    sections: [
      { name: 'Numerical Ability', questionCount: 20, timeLimitMinutes: 25, topics: ['Number Systems', 'Percentages', 'Time & Work', 'P&C'] },
      { name: 'Reasoning Ability', questionCount: 20, timeLimitMinutes: 25, topics: ['Data Sufficiency', 'Blood Relations', 'Coding-Decoding'] },
      { name: 'Verbal Ability', questionCount: 25, timeLimitMinutes: 25, topics: ['Reading Comprehension', 'Sentence Correction', 'Grammar'] },
      { name: 'Hands-on Coding', questionCount: 2, timeLimitMinutes: 45, topics: ['Arrays', 'Strings', 'Dynamic Programming Basics'] }
    ],
    totalQuestions: 67,
    totalDurationMinutes: 120,
    difficulty: 'Medium',
    averagePackage: '₹3.6 - ₹11.5 LPA',
    hiringOverview: 'TCS conducts the NQT exam pan-India. Students scoring above 80th percentile are invited for Digital and Prime interview rounds.',
    interviewProcess: ['TCS NQT Online Exam', 'Technical Interview (TR)', 'Managerial Interview (MR)', 'HR Interview'],
    keyPreparationTips: [
      'Focus on speed during Numerical Ability; questions are strictly time-bound per section.',
      'Coding section has no partial marks for compilation errors; test on all sample cases first.',
      'Be clear on your final-year college project implementation and DB schema.'
    ]
  },
  {
    id: 'infosys',
    slug: 'infosys',
    name: 'Infosys',
    tier: 'IT Giant',
    rolesHired: ['Systems Engineer (3.6 LPA)', 'Specialist Programmer (9.5 LPA)', 'Digital Specialist Engineer (6.25 LPA)'],
    testFormat: 'Infosys Online Placement Assessment + HackWithInfy',
    sections: [
      { name: 'Reasoning Ability', questionCount: 15, timeLimitMinutes: 25, topics: ['Data Interpretation', 'Syllogism', 'Puzzles'] },
      { name: 'Technical Ability (Pseudo-Code)', questionCount: 10, timeLimitMinutes: 35, topics: ['C/C++ Pointers', 'Recursion traces', 'Algorithm Time Complexity'] },
      { name: 'Verbal Ability', questionCount: 20, timeLimitMinutes: 20, topics: ['Grammar', 'Paragraph Completion'] },
      { name: 'Numerical Puzzle', questionCount: 5, timeLimitMinutes: 10, topics: ['Pattern Recognition', 'Mathematical Logic'] }
    ],
    totalQuestions: 50,
    totalDurationMinutes: 100,
    difficulty: 'Hard',
    averagePackage: '₹3.6 - ₹9.5 LPA',
    hiringOverview: 'Infosys assessments are renowned for their tricky pseudo-code recursion analysis and strict section cutoffs.',
    interviewProcess: ['Online Assessment', 'Technical + HR Combined Interview'],
    keyPreparationTips: [
      'Master recursion call stacks; Infosys Pseudo-Code questions often have nested recursive trees.',
      'No negative marking, but accuracy determines section qualification.'
    ]
  },
  {
    id: 'zoho',
    slug: 'zoho',
    name: 'Zoho Corporation',
    tier: 'High-Growth Tech',
    rolesHired: ['Software Developer', 'Quality Analyst', 'Technical Support Engineer'],
    testFormat: 'Zoho Multi-Stage Practical Problem Solving Challenge',
    sections: [
      { name: 'Basic Programming & Aptitude', questionCount: 25, timeLimitMinutes: 60, topics: ['C/Java Output Tracing', 'Pointers', 'Aptitude Math'] },
      { name: 'Basic Coding Round', questionCount: 5, timeLimitMinutes: 90, topics: ['String Manipulations', 'Matrix Rotations', 'Patterns'] },
      { name: 'Advanced Coding Round', questionCount: 1, timeLimitMinutes: 180, topics: ['Console Application', 'Railway Reservation', 'Dungeon Game'] }
    ],
    totalQuestions: 31,
    totalDurationMinutes: 330,
    difficulty: 'Hard',
    averagePackage: '₹6.5 - ₹10.0 LPA',
    hiringOverview: 'Zoho evaluates raw algorithmic logic and OOP software design. No standard framework knowledge is required.',
    interviewProcess: ['Round 1: MCQ & Code Output', 'Round 2: Basic Programming', 'Round 3: Advanced Console App Design', 'Round 4: Technical HR', 'Round 5: General HR'],
    keyPreparationTips: [
      'Practice writing code in plain C, C++, or Java without using high-level utility libraries.',
      'Design modular functions with clear naming conventions for Round 3 console apps.'
    ]
  },
  {
    id: 'amazon',
    slug: 'amazon',
    name: 'Amazon',
    tier: 'Tier-1 Product',
    rolesHired: ['SDE-1 (Full-Time)', 'SDE Intern'],
    testFormat: 'Amazon Online Assessment (OA) on HackerRank',
    sections: [
      { name: 'Coding Challenge', questionCount: 2, timeLimitMinutes: 70, topics: ['Graphs & Trees', 'Dynamic Programming', 'Sliding Window'] },
      { name: 'Work Style Assessment', questionCount: 30, timeLimitMinutes: 20, topics: ['Amazon 16 Leadership Principles', 'Customer Obsession'] }
    ],
    totalQuestions: 32,
    totalDurationMinutes: 90,
    difficulty: 'Hard',
    averagePackage: '₹28.0 - ₹44.0 LPA',
    hiringOverview: 'Amazon hires through on-campus recruitment and off-campus WOW/OA challenges. Strict adherence to Amazon Leadership Principles is tested in every round.',
    interviewProcess: ['Online Assessment (OA)', 'Technical Interview 1 (DSA)', 'Technical Interview 2 (DSA & Architecture)', 'Technical Interview 3 (DSA & System Design)', 'Bar Raiser Round'],
    keyPreparationTips: [
      'Every behavioral answer must strictly use the STAR format (Situation, Task, Action, Result).',
      'Always discuss time and space complexity before writing a single line of code.'
    ]
  },
  {
    id: 'accenture',
    slug: 'accenture',
    name: 'Accenture',
    tier: 'IT Giant',
    rolesHired: ['Associate Software Engineer (4.5 LPA)', 'Advanced ASE (6.5 LPA)'],
    testFormat: 'Accenture Cognitive & Technical Assessment',
    sections: [
      { name: 'Cognitive Assessment', questionCount: 50, timeLimitMinutes: 50, topics: ['English Ability', 'Critical Reasoning', 'Abstract Reasoning'] },
      { name: 'Technical Assessment', questionCount: 40, timeLimitMinutes: 40, topics: ['Common Application & MS Office', 'Pseudo-code', 'Cloud & Network Security'] },
      { name: 'Coding Round', questionCount: 2, timeLimitMinutes: 45, topics: ['String Manipulation', 'Array Searching'] }
    ],
    totalQuestions: 92,
    totalDurationMinutes: 135,
    difficulty: 'Medium',
    averagePackage: '₹4.5 - ₹6.5 LPA',
    hiringOverview: 'Accenture uses an elimination-based online assessment powered by Wheebox or AMCAT.',
    interviewProcess: ['Cognitive + Technical Test', 'Live Coding Assessment', 'Communication Assessment', 'HR Interview'],
    keyPreparationTips: [
      'Ensure clear vocal pronunciation for the automated communication assessment round.',
      'Review fundamental cloud concepts and networking protocols.'
    ]
  }
];
