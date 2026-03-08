// SM-2 Spaced Repetition Algorithm
//
// Each SR item: { questionKey, easeFactor, interval, nextReviewDate, repetitions, lastReviewed, addedDate }
// questionKey format: "weekly_1_3" = weekly quiz, week 1, question index 3

export interface SrItem {
  questionKey: string;
  easeFactor: number;
  interval: number;
  nextReviewDate: string;
  repetitions: number;
  lastReviewed: string;
  addedDate: string;
}

export interface QuizAnswer {
  qIdx: number;
  correct: boolean;
}

export interface ReviewAnswer {
  questionKey: string;
  correct: boolean;
}

const today = (): string => new Date().toISOString().slice(0, 10);

// Update a single SR item based on whether the answer was correct
export function updateSrItem(item: SrItem, wasCorrect: boolean): SrItem {
  const now = today();
  if (wasCorrect) {
    const reps = item.repetitions + 1;
    let interval;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(item.interval * item.easeFactor);
    // Ease factor adjusts slightly upward on correct
    const ease = Math.max(1.3, item.easeFactor + 0.1);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);
    return {
      ...item,
      repetitions: reps,
      interval,
      easeFactor: ease,
      nextReviewDate: nextDate.toISOString().slice(0, 10),
      lastReviewed: now,
    };
  } else {
    // Wrong — reset repetitions, short interval, decrease ease
    const ease = Math.max(1.3, item.easeFactor - 0.2);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);
    return {
      ...item,
      repetitions: 0,
      interval: 1,
      easeFactor: ease,
      nextReviewDate: nextDate.toISOString().slice(0, 10),
      lastReviewed: now,
    };
  }
}

// Get all items that are due for review (nextReviewDate <= today)
export function getDueItems(srQueue: Record<string, SrItem> | undefined): string[] {
  const now = today();
  return Object.keys(srQueue || {}).filter(key => {
    const item = srQueue![key];
    return item.nextReviewDate <= now;
  });
}

// Process quiz results — add missed questions to SR queue, advance correct ones already in queue
export function processQuizResults(answers: QuizAnswer[], source: string, week: number, existingSrQueue: Record<string, SrItem>): Record<string, SrItem> {
  const queue = { ...existingSrQueue };
  const now = today();

  for (const a of answers) {
    const questionKey = `${source}_${week}_${a.qIdx}`;

    if (!a.correct) {
      // Missed — add to queue or reset if already there
      if (queue[questionKey]) {
        queue[questionKey] = updateSrItem(queue[questionKey], false);
      } else {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 1);
        queue[questionKey] = {
          questionKey,
          easeFactor: 2.5,
          interval: 1,
          nextReviewDate: nextDate.toISOString().slice(0, 10),
          repetitions: 0,
          lastReviewed: now,
          addedDate: now,
        };
      }
    } else if (queue[questionKey]) {
      // Correct and already in queue — advance schedule
      queue[questionKey] = updateSrItem(queue[questionKey], true);
    }
  }

  return queue;
}

// Process SR review session results — each answer has { questionKey, correct }
export function processReviewResults(reviewAnswers: ReviewAnswer[], existingSrQueue: Record<string, SrItem>): Record<string, SrItem> {
  const queue = { ...existingSrQueue };

  for (const a of reviewAnswers) {
    if (queue[a.questionKey]) {
      queue[a.questionKey] = updateSrItem(queue[a.questionKey], a.correct);
    }
  }

  return queue;
}

// Count total SR reviews (sum of all repetitions across queue items)
export function totalSrReviews(srQueue: Record<string, SrItem> | undefined): number {
  return Object.values(srQueue || {}).reduce((sum, item) => sum + item.repetitions, 0);
}
