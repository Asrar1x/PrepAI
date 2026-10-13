/**
 * Practice streak and XP bookkeeping shared by the aptitude and interview flows.
 */

function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Records a completed practice activity: updates the daily streak and adds XP.
 * The caller is responsible for saving the user document.
 */
function recordPractice(user, xp = 0, now = new Date()) {
  const today = dayKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dayKey(yesterdayDate);
  const last = user.lastPracticeDate ? dayKey(user.lastPracticeDate) : null;

  if (last !== today) {
    user.currentStreak = last === yesterday ? (user.currentStreak || 0) + 1 : 1;
    user.longestStreak = Math.max(user.longestStreak || 0, user.currentStreak);
    user.lastPracticeDate = now;
  }
  user.totalXp = (user.totalXp || 0) + xp;
  return user;
}

module.exports = { recordPractice, dayKey };
