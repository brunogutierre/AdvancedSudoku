import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Architecture guard: the engine is framework-agnostic so it can run in a Web Worker,
 * in Node scripts and in tests without Angular. Fails if any engine file imports Angular.
 */
describe('engine purity', () => {
  const dir = join(process.cwd(), 'src/app/engine');

  function listTsFiles(path: string): string[] {
    return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? listTsFiles(join(path, entry.name))
        : entry.name.endsWith('.ts')
          ? [join(path, entry.name)]
          : [],
    );
  }

  it('has no Angular imports', () => {
    const files = listTsFiles(dir).filter((f) => !f.endsWith('engine-purity.spec.ts'));
    expect(files.length).toBeGreaterThan(5);
    const offenders = files.filter((f) => /from\s+['"]@angular\//.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
