import type { Difficulty, GameMode, GameState } from '../game/game.model';

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'insane'];

/** Most recent wins kept for history and charts; aggregates below are never truncated. */
export const MAX_RECENT = 500;

/** Running totals per difficulty, so dropping old records never changes them. */
export interface DifficultyStats {
  readonly started: number;
  readonly won: number;
  /** Wins without hints or auto-candidates: the only ones that count for times. */
  readonly unassistedWins: number;
  readonly unassistedTimeMs: number;
  readonly bestMs: number | null;
}

/** One solved game. */
export interface GameRecord {
  readonly difficulty: Difficulty;
  readonly mode: GameMode;
  readonly dailyDate: string | null;
  readonly elapsedMs: number;
  readonly assisted: boolean;
  readonly mistakes: number;
  readonly hintsUsed: number;
  /** ISO timestamp. */
  readonly finishedAt: string;
}

export interface StatsData {
  readonly perDifficulty: Readonly<Record<Difficulty, DifficultyStats>>;
  /** Oldest first, at most {@link MAX_RECENT}. */
  readonly recent: readonly GameRecord[];
  /** Solved daily puzzles: 'YYYY-MM-DD' -> best time. */
  readonly dailyWins: Readonly<Record<string, number>>;
}

/** Aggregates for one difficulty or all of them. */
export interface StatsSummary {
  readonly played: number;
  readonly won: number;
  /** 0..1, or null before the first game. */
  readonly winRate: number | null;
  readonly bestMs: number | null;
  readonly averageMs: number | null;
}

const ZERO: DifficultyStats = {
  started: 0,
  won: 0,
  unassistedWins: 0,
  unassistedTimeMs: 0,
  bestMs: null,
};

export function emptyStats(): StatsData {
  return {
    perDifficulty: { easy: ZERO, medium: ZERO, hard: ZERO, insane: ZERO },
    recent: [],
    dailyWins: {},
  };
}

function updateDifficulty(
  data: StatsData,
  difficulty: Difficulty,
  change: (current: DifficultyStats) => DifficultyStats,
): StatsData['perDifficulty'] {
  return { ...data.perDifficulty, [difficulty]: change(data.perDifficulty[difficulty]) };
}

export function withStart(data: StatsData, difficulty: Difficulty): StatsData {
  return {
    ...data,
    perDifficulty: updateDifficulty(data, difficulty, (s) => ({ ...s, started: s.started + 1 })),
  };
}

export function withWin(data: StatsData, game: GameState, finishedAt: Date): StatsData {
  const { difficulty, elapsedMs, assisted } = game;
  const record: GameRecord = {
    difficulty,
    mode: game.mode,
    dailyDate: game.dailyDate,
    elapsedMs,
    assisted,
    mistakes: game.mistakes,
    hintsUsed: game.hintsUsed,
    finishedAt: finishedAt.toISOString(),
  };
  const perDifficulty = updateDifficulty(data, difficulty, (s) => ({
    // A restored game may have been started before stats existed: keep started >= won.
    started: Math.max(s.started, s.won + 1),
    won: s.won + 1,
    unassistedWins: s.unassistedWins + (assisted ? 0 : 1),
    unassistedTimeMs: s.unassistedTimeMs + (assisted ? 0 : elapsedMs),
    bestMs: assisted ? s.bestMs : Math.min(s.bestMs ?? Infinity, elapsedMs),
  }));
  const dailyWins = { ...data.dailyWins };
  if (game.mode === 'daily' && game.dailyDate) {
    dailyWins[game.dailyDate] = Math.min(dailyWins[game.dailyDate] ?? Infinity, elapsedMs);
  }
  return { perDifficulty, recent: [...data.recent, record].slice(-MAX_RECENT), dailyWins };
}

export function summarize(data: StatsData, filter: Difficulty | 'all'): StatsSummary {
  const parts =
    filter === 'all'
      ? DIFFICULTIES.map((d) => data.perDifficulty[d])
      : [data.perDifficulty[filter]];
  const played = parts.reduce((n, s) => n + s.started, 0);
  const won = parts.reduce((n, s) => n + s.won, 0);
  const unassisted = parts.reduce((n, s) => n + s.unassistedWins, 0);
  const time = parts.reduce((n, s) => n + s.unassistedTimeMs, 0);
  const bests = parts.map((s) => s.bestMs).filter((ms): ms is number => ms !== null);
  return {
    played,
    won,
    winRate: played > 0 ? won / played : null,
    bestMs: bests.length > 0 ? Math.min(...bests) : null,
    averageMs: unassisted > 0 ? Math.round(time / unassisted) : null,
  };
}

/** 'YYYY-MM-DD' shifted by whole days (calendar arithmetic in UTC, no DST surprises). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Daily streaks. The current streak still counts when today's puzzle is not solved yet
 * (it ends yesterday); it breaks only after a full missed day.
 */
export function dailyStreaks(
  dailyWins: Readonly<Record<string, number>>,
  today: string,
): { current: number; longest: number } {
  const dates = Object.keys(dailyWins).sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of dates) {
    run = previous !== null && addDays(previous, 1) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }
  let current = 0;
  let day = today in dailyWins ? today : addDays(today, -1);
  while (day in dailyWins) {
    current++;
    day = addDays(day, -1);
  }
  return { current, longest };
}

// ---- Validation of stored data ----

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isRecordObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function isDifficultyStats(v: unknown): v is DifficultyStats {
  return (
    isRecordObject(v) &&
    isCount(v['started']) &&
    isCount(v['won']) &&
    isCount(v['unassistedWins']) &&
    isCount(v['unassistedTimeMs']) &&
    (v['bestMs'] === null || isCount(v['bestMs']))
  );
}

function isGameRecord(v: unknown): v is GameRecord {
  return (
    isRecordObject(v) &&
    DIFFICULTIES.includes(v['difficulty'] as Difficulty) &&
    (v['mode'] === 'classic' || v['mode'] === 'daily') &&
    (v['dailyDate'] === null ||
      (typeof v['dailyDate'] === 'string' && DATE.test(v['dailyDate']))) &&
    isCount(v['elapsedMs']) &&
    typeof v['assisted'] === 'boolean' &&
    isCount(v['mistakes']) &&
    isCount(v['hintsUsed']) &&
    typeof v['finishedAt'] === 'string'
  );
}

export function isStatsData(v: unknown): v is StatsData {
  if (
    !isRecordObject(v) ||
    !isRecordObject(v['perDifficulty']) ||
    !isRecordObject(v['dailyWins'])
  ) {
    return false;
  }
  const per = v['perDifficulty'];
  const daily = v['dailyWins'];
  return (
    DIFFICULTIES.every((d) => isDifficultyStats(per[d])) &&
    Array.isArray(v['recent']) &&
    v['recent'].length <= MAX_RECENT &&
    v['recent'].every(isGameRecord) &&
    Object.entries(daily).every(([date, ms]) => DATE.test(date) && isCount(ms))
  );
}
