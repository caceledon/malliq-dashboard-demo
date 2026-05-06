// K1 + K3 regression: scans the marketing tree (source files) for non-Chilean
// fixtures and known-fake names. Adding any of these strings to a marketing
// page should fail CI.
//
// Add allowed exceptions to ALLOWLIST below with a comment explaining why.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
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

const FORBIDDEN: { pattern: RegExp; reason: string }[] = [
  // K1 / K3 — Mexican fixtures
  { pattern: /\bMéxico\b/i, reason: 'Mexico is out of scope; MallIQ is Chile-only' },
  { pattern: /\bMexico\b(?! Pavillon)/i, reason: 'Mexico is out of scope' },
  { pattern: /\bCDMX\b/, reason: 'CDMX → Santiago' },
  { pattern: /\bMXN\b/, reason: 'MXN → CLP / UF' },
  { pattern: /\+\s*52\b/, reason: '+52 → +56' },
  { pattern: /\bmalliq\.mx\b/, reason: '@malliq.mx → @malliq.cl' },
  { pattern: /\bSAPI DE CV\b/i, reason: 'Mexican legal entity → Chilean SpA' },
  { pattern: /Querétaro/i, reason: 'Querétaro → Chile' },
  { pattern: /Reforma 222/i, reason: 'Mexican landmark' },
  { pattern: /\bAntara\b/i, reason: 'Mexican mall name' },
  { pattern: /Liverpool/i, reason: 'Mexican department store' },
  { pattern: /\bDanhos\b/i, reason: 'Mexican real estate group' },
  { pattern: /Sordo Madaleno/i, reason: 'Mexican real estate group' },
  { pattern: /\bToreo\b/i, reason: 'Mexican mall name' },
  { pattern: /Centro Santa Fe/i, reason: 'Mexican mall name' },
  { pattern: /Banorte/i, reason: 'Mexican bank' },
  { pattern: /\bCFDI\b/i, reason: 'Mexican fiscal doc → Chilean DTE' },
  { pattern: /\bSAT\b(?!ELIT)/i, reason: 'Mexican fiscal authority → SII' },
  { pattern: /\bOXXO\b/, reason: 'Mexican retail chain' },

  // K1 / K3 — fake humans the product owner flagged
  { pattern: /Mariana Solís/i, reason: 'Invented person' },
  { pattern: /Quirarte/i, reason: 'Invented person' },
  { pattern: /Pellicer/i, reason: 'Invented person' },
  { pattern: /Berenguer/i, reason: 'Invented person' },
  { pattern: /Iturbe/i, reason: 'Invented person' },
  { pattern: /Quiroz/i, reason: 'Invented person' },
  { pattern: /Saavedra/i, reason: 'Invented person' },
  { pattern: /Iñaki/i, reason: 'Invented person' },
  { pattern: /Otaegui/i, reason: 'Invented person' },

  // K1 / K3 — invented investors
  { pattern: /Variv Capital/i, reason: 'Invented investor' },
  { pattern: /Kaszek/i, reason: 'Invented investor in this context' },
  { pattern: /MAYA Capital/i, reason: 'Invented investor' },
  { pattern: /\bALL VP\b/, reason: 'Invented investor' },
  { pattern: /Magma Partners/i, reason: 'Invented investor' },
  { pattern: /Liquid 2/i, reason: 'Invented investor' },

  // K2 — other Latam markets we don't operate in yet
  { pattern: /Bogotá/i, reason: 'Colombia is out of scope' },
  { pattern: /\bColombia\b/i, reason: 'Out of scope' },
  { pattern: /\+\s*57\b/, reason: 'Colombian dial prefix' },
];

// File-level allowlist — full path suffix match. Use sparingly; prefer fixing
// the source over allowlisting.
const FILE_ALLOWLIST = new Set<string>([]);

describe('K1 + K3 — marketing locale lint', () => {
  it('contains no Mexican fixtures, fake humans, or non-CL Latam markets in marketing source', () => {
    const repoRoot = resolve(__dirname, '../..');
    const ext = /\.(ts|tsx)$/;
    const files = [
      ...walkSync(join(repoRoot, 'src/pages/marketing'), ext),
      ...walkSync(join(repoRoot, 'src/components/marketing'), ext),
    ];

    expect(files.length).toBeGreaterThan(0); // sanity — we found marketing source

    const violations: { file: string; reason: string; match: string; line: number }[] = [];

    for (const file of files) {
      if ([...FILE_ALLOWLIST].some((suffix) => file.endsWith(suffix))) continue;
      const text = readFileSync(file, 'utf8');
      const lines = text.split(/\r?\n/);
      for (const { pattern, reason } of FORBIDDEN) {
        for (let i = 0; i < lines.length; i += 1) {
          const m = pattern.exec(lines[i]);
          if (m) {
            violations.push({
              file: file.replace(/\\/g, '/'),
              reason,
              match: m[0],
              line: i + 1,
            });
          }
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .slice(0, 30)
        .map((v) => `  ${v.file}:${v.line}  "${v.match}"  — ${v.reason}`)
        .join('\n');
      throw new Error(
        `Marketing locale lint found ${violations.length} forbidden string(s):\n${report}\n\n` +
          'Either fix the source (preferred) or allowlist the file with a justifying comment.',
      );
    }
    expect(violations).toEqual([]);
  });
});
