// Regression: new code must use useCurrency() from @/lib/currency, not the
// legacy formatPeso helper from @/lib/format. Importing formatPeso outside the
// allowlist below fails CI so the migration to the date-aware UF/CLP context
// can't silently regress.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

function walkSync(dir: string, ext: RegExp): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walkSync(full, ext));
    } else if (ext.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

// Allowed callers — relative paths from repo root, OS-agnostic.
const ALLOWLIST = new Set<string>([
  // Definition site.
  ['src', 'lib', 'format.ts'].join(sep),
]);

const IMPORT_RE = /import\s*(?:[^'"`]*\bformatPeso\b[^'"`]*)from\s*['"]@\/lib\/format['"]/;

describe('formatPeso import regression guard', () => {
  it('no source file outside the allowlist imports formatPeso', () => {
    const repoRoot = resolve(__dirname, '../..');
    const srcDir = join(repoRoot, 'src');
    const files = walkSync(srcDir, /\.(ts|tsx)$/);
    const offenders: string[] = [];
    for (const file of files) {
      const relative = file.slice(repoRoot.length + 1);
      if (ALLOWLIST.has(relative)) continue;
      const content = readFileSync(file, 'utf8');
      if (IMPORT_RE.test(content)) {
        offenders.push(relative);
      }
    }
    expect(offenders, 'use useCurrency() from @/lib/currency in new UI').toEqual([]);
  });
});
