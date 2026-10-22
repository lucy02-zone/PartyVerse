import { questionBank } from "./questions.js";

export const QUIZ_CATEGORIES = [
  "All",
  "General Knowledge",
  "Science",
  "Technology",
  "Sports",
  "Programming",
  "Telugu Movies",
  "Puzzle Mix",
];

export const QUIZ_DIFFICULTIES = ["Mixed", "Easy", "Medium", "Hard"];
export const QUIZ_QUESTION_COUNTS = [5, 10, 15];

export function normalizeQuizConfig(config = {}) {
  const category = QUIZ_CATEGORIES.includes(config.category)
    ? config.category
    : "All";
  const difficulty = QUIZ_DIFFICULTIES.includes(config.difficulty)
    ? config.difficulty
    : "Mixed";
  const questionCount = QUIZ_QUESTION_COUNTS.includes(Number(config.questionCount))
    ? Number(config.questionCount)
    : 5;
  const timeLimit = Number.isFinite(Number(config.timeLimit)) && Number(config.timeLimit) > 0
    ? Number(config.timeLimit)
    : 15;

  return {
    category,
    difficulty,
    questionCount,
    timeLimit,
  };
}

export function selectQuestions(category, difficulty, count) {
  let pool = [...questionBank];

  if (category !== "All") {
    pool = pool.filter((question) => question.category === category);
  }

  if (difficulty !== "Mixed") {
    pool = pool.filter((question) => question.difficulty === difficulty);
  }

  if (pool.length < count) {
    const fallbackPool = questionBank.filter(
      (question) => !pool.some((item) => item.question === question.question)
    );
    pool = [...pool, ...fallbackPool];
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function buildQuizGame({ players = [], category = "All", difficulty = "Mixed", questionCount = 5, timeLimit = 15 }) {
  const normalizedPlayers = players
    .map((player) => (typeof player === "string" ? player.trim() : ""))
    .filter(Boolean);

  if (normalizedPlayers.length < 2 || normalizedPlayers.length > 10) {
    throw new Error("Quiz Battle requires 2 to 10 players.");
  }

  const uniqueNames = new Set(normalizedPlayers.map((player) => player.toLowerCase()));
  if (uniqueNames.size !== normalizedPlayers.length) {
    throw new Error("Player names must be unique.");
  }

  const config = normalizeQuizConfig({ category, difficulty, questionCount, timeLimit });

  return {
    players: normalizedPlayers.map((name) => ({
      name,
      score: 0,
      correctAnswers: 0,
      attempts: 0,
    })),
    questions: selectQuestions(
      config.category,
      config.difficulty,
      config.questionCount
    ),
    category: config.category,
    difficulty: config.difficulty,
    questionCount: config.questionCount,
    timeLimit: config.timeLimit,
  };
}

export function applyPlayerAnswer(players, playerName, isCorrect) {
  return players.map((player) => {
    if (player.name !== playerName) {
      return player;
    }

    const nextCorrect = isCorrect ? player.correctAnswers + 1 : player.correctAnswers;
    const nextScore = isCorrect ? player.score + 10 : player.score;

    return {
      ...player,
      attempts: player.attempts + 1,
      correctAnswers: nextCorrect,
      score: nextScore,
    };
  });
}

export function getLeaderboard(players) {
  return [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
    return a.name.localeCompare(b.name);
  });
}

export function getWinnerNames(players) {
  const leaderboard = getLeaderboard(players);
  const topScore = leaderboard[0]?.score ?? 0;

  return leaderboard
    .filter((player) => player.score === topScore)
    .map((player) => player.name);
}

export function getAccuracy(player) {
  if (player.attempts === 0) return 0;
  return Number(((player.correctAnswers / player.attempts) * 100).toFixed(1));
}
