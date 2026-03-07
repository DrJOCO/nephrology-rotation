// Points system: recalculated from student data (idempotent, deterministic)
//
// Designed for a 4-week nephrology rotation:
//   Week 1 (~70 pts)  → Medical Student
//   Week 2 (~140 pts) → Resident
//   Week 3-4 (~250 pts) → Nephrology Fellow  (end-of-rotation goal)
//   Completionist (~380 pts) → Attending  (stretch goal)
//
export function calculatePoints(state) {
  let pts = 0;
  const patients = state.patients || [];

  // Patient points (5 per patient, bonuses for detail)
  pts += patients.length * 5;
  pts += patients.filter(p => (p.topics || []).length >= 2).length * 3;  // multi-topic bonus
  pts += patients.filter(p => p.notes && p.notes.trim()).length * 3;     // clinical notes bonus

  // Quiz points (10 per attempt, bonuses for performance)
  const ws = state.weeklyScores || {};
  const allAttempts = Object.values(ws).flat();
  pts += allAttempts.length * 10;
  pts += allAttempts.filter(a => a.total > 0 && (a.correct / a.total) >= 0.8).length * 5;   // ≥80% bonus
  pts += allAttempts.filter(a => a.total > 0 && a.correct === a.total).length * 10;          // perfect bonus

  // Assessment points
  if (state.preScore) pts += 15;
  if (state.postScore) pts += 15;
  if (state.preScore && state.postScore &&
      state.postScore.total > 0 && state.preScore.total > 0 &&
      (state.postScore.correct / state.postScore.total) > (state.preScore.correct / state.preScore.total)) {
    pts += 20;  // improvement bonus
  }

  // Streak bonus (3 per day — rewards consistency over time)
  const streak = state.gamification?.streaks?.currentDays || 0;
  pts += streak * 3;

  // Completion tracking points (2 per article read, 3 per study sheet completed)
  const completed = state.completedItems || { articles: {}, studySheets: {} };
  pts += Object.keys(completed.articles || {}).length * 2;
  pts += Object.keys(completed.studySheets || {}).length * 3;

  return pts;
}

// Levels based on total points — designed so Fellow is reachable at end of a 4-week rotation
export function getLevel(points) {
  if (points >= 350) return { name: "Attending", icon: "👨‍⚕️", next: null, nextAt: null };
  if (points >= 200) return { name: "Nephrology Fellow", icon: "⭐", next: "Attending", nextAt: 350 };
  if (points >= 75) return { name: "Resident", icon: "🩺", next: "Nephrology Fellow", nextAt: 200 };
  return { name: "Medical Student", icon: "📚", next: "Resident", nextAt: 75 };
}

// Helper functions for achievement checks
function uniqueTopics(state) {
  const topics = new Set();
  (state.patients || []).forEach(p => (p.topics || []).forEach(t => topics.add(t)));
  return topics.size;
}

function totalQuizzes(state) {
  const ws = state.weeklyScores || {};
  return Object.values(ws).flat().length;
}

function weeksWithQuizzes(state) {
  const ws = state.weeklyScores || {};
  return Object.keys(ws).filter(k => ws[k] && ws[k].length > 0).length;
}

function hasPerfectQuiz(state) {
  const ws = state.weeklyScores || {};
  return Object.values(ws).flat().some(a => a.total > 0 && a.correct === a.total);
}

function patientsWithNotes(state) {
  return (state.patients || []).filter(p => p.notes && p.notes.trim()).length;
}

// Achievement definitions
export const ACHIEVEMENTS = [
  { id: "first_patient", icon: "🏥", title: "First Consult", desc: "Logged your first patient",
    check: (s) => (s.patients || []).length >= 1 },
  { id: "five_patients", icon: "🏆", title: "High Census", desc: "Logged 5 patients",
    check: (s) => (s.patients || []).length >= 5 },
  { id: "ten_patients", icon: "⭐", title: "Seasoned Rounder", desc: "Logged 10 patients",
    check: (s) => (s.patients || []).length >= 10 },
  { id: "topic_diversity", icon: "🌈", title: "Well-Rounded", desc: "Covered 8+ different topics",
    check: (s) => uniqueTopics(s) >= 8 },
  { id: "all_topics", icon: "🎯", title: "Topic Master", desc: "Saw all major nephrology topics",
    check: (s) => uniqueTopics(s) >= 15 },
  { id: "quiz_starter", icon: "📝", title: "Quiz Taker", desc: "Completed your first quiz",
    check: (s) => totalQuizzes(s) >= 1 },
  { id: "all_quizzes", icon: "🎓", title: "Knowledge Seeker", desc: "Completed all 4 weekly quizzes",
    check: (s) => weeksWithQuizzes(s) === 4 },
  { id: "quiz_ace", icon: "💯", title: "Quiz Ace", desc: "Scored 100% on any quiz",
    check: (s) => hasPerfectQuiz(s) },
  { id: "pre_post", icon: "📊", title: "Full Circle", desc: "Completed both pre and post assessments",
    check: (s) => s.preScore && s.postScore },
  { id: "growth", icon: "🌱", title: "Growth Mindset", desc: "Improved from pre to post test",
    check: (s) => s.preScore && s.postScore && s.preScore.total > 0 && s.postScore.total > 0 &&
      (s.postScore.correct / s.postScore.total) > (s.preScore.correct / s.preScore.total) },
  { id: "streak_3", icon: "🔥", title: "On a Roll", desc: "3-day activity streak",
    check: (s) => (s.gamification?.streaks?.currentDays || 0) >= 3 },
  { id: "streak_7", icon: "🔥", title: "Week Warrior", desc: "7-day activity streak",
    check: (s) => (s.gamification?.streaks?.currentDays || 0) >= 7 },
  { id: "note_taker", icon: "💡", title: "Teaching Pearls", desc: "Added notes to 5 patients",
    check: (s) => patientsWithNotes(s) >= 5 },
];

// Check which achievements are newly earned
export function checkAchievements(state) {
  const earned = state.gamification?.achievements || [];
  const newlyEarned = [];
  for (const a of ACHIEVEMENTS) {
    if (!earned.includes(a.id) && a.check(state)) {
      newlyEarned.push(a.id);
    }
  }
  return newlyEarned;
}

// Update daily streak + maintain activity log for calendar
export function updateStreak(gamification) {
  const streaks = gamification?.streaks || { currentDays: 0, longestDays: 0, lastActiveDate: null };
  const today = new Date().toISOString().slice(0, 10);
  const existingLog = streaks.activityLog || [];

  if (streaks.lastActiveDate === today) {
    return { ...streaks, activityLog: existingLog }; // already counted today
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let currentDays;
  if (streaks.lastActiveDate === yesterday) {
    currentDays = streaks.currentDays + 1;
  } else {
    currentDays = 1; // streak broken, restart
  }

  // Add today to activity log (deduped)
  const updatedLog = existingLog.includes(today) ? existingLog : [...existingLog, today];

  return {
    currentDays,
    longestDays: Math.max(streaks.longestDays, currentDays),
    lastActiveDate: today,
    activityLog: updatedLog,
  };
}
