import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type Meta = { title: string; description: string };

const SITE = 'PrepAI';
const DEFAULT_META: Meta = {
  title: 'Placement Preparation',
  description: 'Practise placement interviews, company-pattern aptitude tests and resume screening. Every score shows the evidence it is based on.'
};

// First matching pattern wins; order specific paths before general ones
const ROUTE_META: [RegExp, Meta][] = [
  [/^\/$/, { title: 'Placement Interview and Aptitude Practice', description: DEFAULT_META.description }],
  [/^\/(auth|login)$/, { title: 'Sign In', description: 'Sign in to PrepAI to continue your placement preparation.' }],
  [/^\/register$/, { title: 'Create Account', description: 'Create a free PrepAI student account for mock interviews, aptitude tests and resume screening.' }],
  [/^\/forgot-password$/, { title: 'Forgot Password', description: 'Request a code to reset your PrepAI password.' }],
  [/^\/reset-password$/, { title: 'Reset Password', description: 'Set a new password for your PrepAI account.' }],
  [/^\/privacy$/, { title: 'Privacy Policy', description: 'What PrepAI stores, where it is processed, how the camera feedback works and how to delete your data.' }],
  [/^\/terms$/, { title: 'Terms and Conditions', description: 'The terms for using PrepAI, a placement practice tool.' }],
  [/^\/dashboard$/, { title: 'Dashboard', description: 'Your readiness score, recent practice, topic mastery and today\'s study plan.' }],
  [/^\/roles\/[^/]+\/gap$/, { title: 'Skill Gap Analyzer', description: 'Rate your skills for a role and get a study plan that targets your gaps.' }],
  [/^\/roles\/[^/]+$/, { title: 'Role Details', description: 'Skills, interview focus and recruiters for this engineering role.' }],
  [/^\/roles$/, { title: 'Role Explorer', description: 'Browse engineering roles and the skills each one is interviewed on.' }],
  [/^\/companies\/[^/]+$/, { title: 'Company Test Pattern', description: 'Sections, timing and interview rounds for this company.' }],
  [/^\/companies$/, { title: 'Company Guides', description: 'Test patterns, sections and interview rounds of companies that hire from campus.' }],
  [/^\/aptitude\/history$/, { title: 'Aptitude History', description: 'Your past aptitude tests with scores, accuracy and time.' }],
  [/^\/aptitude\/daily$/, { title: 'Daily Quest', description: 'Five quick aptitude questions a day to keep your streak going.' }],
  [/^\/aptitude\/[^/]+\/results$/, { title: 'Aptitude Results', description: 'Your score, section-wise accuracy and worked solutions.' }],
  [/^\/aptitude\/[^/]+$/, { title: 'Aptitude Test', description: 'Timed, company-pattern aptitude test.' }],
  [/^\/aptitude$/, { title: 'Aptitude Practice', description: 'Start a timed aptitude test in the pattern of the company you are targeting.' }],
  [/^\/interview\/[^/]+\/end$/, { title: 'Interview Complete', description: 'Your answers are being evaluated for the report.' }],
  [/^\/interview\/[^/]+$/, { title: 'Mock Interview', description: 'Live mock interview with an AI interviewer.' }],
  [/^\/interview$/, { title: 'Mock Interview', description: 'Set up a mock interview by role, company, round and interviewer style.' }],
  [/^\/resume\/score$/, { title: 'ATS Score', description: 'Your resume\'s ATS score with six dimensions and likely interview questions.' }],
  [/^\/resume\/bullets$/, { title: 'Bullet Improver', description: 'Rewrite resume bullets with action verbs and measurable results.' }],
  [/^\/resume$/, { title: 'Resume ATS Check', description: 'Upload your resume PDF to see how an ATS reads it.' }],
  [/^\/report\/shared\/[^/]+$/, { title: 'Shared Interview Report', description: 'A mock interview report shared by a PrepAI student.' }],
  [/^\/(report|reports|feedback)\/[^/]+$/, { title: 'Interview Report', description: 'Scores, evidence, camera feedback and what to improve from your mock interview.' }],
  [/^\/analytics\/progress$/, { title: 'Progress Analytics', description: 'How your interview and aptitude scores have changed over time.' }],
  [/^\/gamification$/, { title: 'Quests and Badges', description: 'XP, earned badges and the anonymised leaderboard.' }],
  [/^\/profile\/notifications$/, { title: 'Notification Settings', description: 'Choose which PrepAI notifications you receive.' }],
  [/^\/profile$/, { title: 'My Profile', description: 'Your academic details, target role and dream company.' }],
  [/^\/admin\/batches$/, { title: 'Batch Analytics', description: 'Weak topics and company readiness across the batch.' }],
  [/^\/admin\/students$/, { title: 'Students', description: 'Student roster with readiness and practice activity.' }],
  [/^\/admin\/questions\/upload$/, { title: 'Upload Questions', description: 'Add aptitude questions to the bank from a CSV file.' }],
  [/^\/admin\/drives$/, { title: 'Drive Mode', description: 'Announce a campus drive to a batch.' }],
  [/^\/admin\/events$/, { title: 'Scheduled Events', description: 'Schedule mock interview events for students.' }],
  [/^\/admin\/reports$/, { title: 'Report Export', description: 'Download batch reports as CSV or PDF.' }],
  [/^\/admin$/, { title: 'Placement Dashboard', description: 'Cohort readiness, scores and company cutoffs for the placement cell.' }],
];

/** Sets a unique document title and meta description for the current route. */
export function usePageMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const hit = ROUTE_META.find(([rx]) => rx.test(pathname));
    const meta = hit ? hit[1] : { title: 'Page Not Found', description: 'This page does not exist on PrepAI.' };
    document.title = `${meta.title} | ${SITE}`;
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    tag.content = meta.description;
  }, [pathname]);
}
