// K4 regression: every <Link to=...> and <a href=...> in the marketing tree
// must resolve to a known route, mailto:, tel:, or external https URL. A
// raw href="#" or a route that doesn't exist fails the test.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const KNOWN_ROUTES = new Set([
  '/',
  '/producto',
  '/operadores',
  '/locatarios-info',
  '/pricing',
  '/manifiesto',
  '/demo',
  '/login',
  '/admin/dashboard',
  '/admin/activos',
  '/admin/locatarios',
  '/admin/rentas',
  '/admin/cargas',
  '/admin/planeacion',
  '/admin/ecosistema',
  '/admin/alertas',
  '/admin/configuracion',
  '/admin/simulador',
  '/admin/asistente',
  '/admin/design-lab',
  '/locatario/dashboard',
  '/locatario/contrato',
  '/locatario/ventas',
]);

function walkSync(dir: string, ext: RegExp): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walkSync(full, ext));
    else if (ext.test(entry)) out.push(full);
  }
  return out;
}

function isAllowedHref(href: string): boolean {
  if (!href) return false;
  if (href === '#') return false;
  if (href.startsWith('mailto:')) return /@/.test(href);
  if (href.startsWith('tel:')) return /\+?\d/.test(href);
  if (href.startsWith('http://') || href.startsWith('https://')) return true;
  // Internal route — strip any trailing slash variant or hash anchor.
  const path = href.split('#')[0].split('?')[0];
  return KNOWN_ROUTES.has(path);
}

describe('K4 — marketing link integrity', () => {
  it('every link in the marketing tree resolves to a known route, mailto, tel, or external URL', () => {
    const repoRoot = resolve(__dirname, '../..');
    const ext = /\.(tsx)$/;
    const files = [
      ...walkSync(join(repoRoot, 'src/pages/marketing'), ext),
      ...walkSync(join(repoRoot, 'src/components/marketing'), ext),
    ];

    expect(files.length).toBeGreaterThan(0);

    const violations: { file: string; line: number; href: string; tag: string }[] = [];

    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        // <Link to="...">
        const linkRe = /<Link\b[^>]*\bto=\{?["']([^"']+)["']\}?/g;
        let match: RegExpExecArray | null;
        while ((match = linkRe.exec(line))) {
          const href = match[1];
          if (!isAllowedHref(href)) {
            violations.push({ file: file.replace(/\\/g, '/'), line: i + 1, href, tag: 'Link' });
          }
        }
        // <a href="...">
        const aRe = /<a\b[^>]*\bhref=\{?["']([^"']+)["']\}?/g;
        while ((match = aRe.exec(line))) {
          const href = match[1];
          if (!isAllowedHref(href)) {
            violations.push({ file: file.replace(/\\/g, '/'), line: i + 1, href, tag: 'a' });
          }
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line}  <${v.tag} to/href="${v.href}">`)
        .join('\n');
      throw new Error(
        `Marketing link integrity check failed (${violations.length} dead link(s)):\n${report}\n\n` +
          'Either point the link at a real route, build the destination, or remove the link.',
      );
    }
    expect(violations).toEqual([]);
  });
});
