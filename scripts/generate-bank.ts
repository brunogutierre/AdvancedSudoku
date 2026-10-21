/**
 * Generates the bank of insane puzzles shipped as a static asset (public/puzzles/insane.json).
 * Insane puzzles are pre-generated because their hit rate makes on-device generation slow.
 * Deterministic: the same BANK_SEED and engine version always produce the same file.
 *
 * Usage: npm run bank            (or: npx tsx scripts/generate-bank.ts [count])
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGrid } from '../src/app/engine/board';
import { generatePuzzle, insaneTechniques } from '../src/app/engine/generator';

/** Bump to regenerate a different bank. */
const BANK_SEED = 'bank:insane:v1';
const DEFAULT_COUNT = 300;

export interface BankEntry {
  /** 81 chars, '.' for empty cells. */
  readonly p: string;
  /** The insane technique the puzzle needs (swordfish preferred when both are used). */
  readonly t: 'swordfish' | 'xyWing';
}

const count = Number(process.argv[2] ?? DEFAULT_COUNT);
const output = resolve(dirname(fileURLToPath(import.meta.url)), '../public/puzzles/insane.json');

const started = performance.now();
const seen = new Set<string>();
const entries: BankEntry[] = [];
for (let i = 0; entries.length < count; i++) {
  const generated = generatePuzzle('insane', `${BANK_SEED}:${i}`);
  if (generated.tier !== 'insane' || seen.has(generated.puzzle)) continue;
  const [technique] = insaneTechniques(parseGrid(generated.puzzle));
  seen.add(generated.puzzle);
  entries.push({ p: generated.puzzle, t: technique });
  if (entries.length % 50 === 0) console.log(`${entries.length}/${count}`);
}

mkdirSync(dirname(output), { recursive: true });
// One entry per line keeps the file diffable.
writeFileSync(output, `[\n${entries.map((e) => JSON.stringify(e)).join(',\n')}\n]\n`);
const seconds = ((performance.now() - started) / 1000).toFixed(1);
console.log(`Wrote ${entries.length} puzzles to ${output} in ${seconds} s`);
