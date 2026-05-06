// Track 1 v1 — source-linked contract abstracts.
//
// Given the per-page text from a PDF and the autofill `evidence` block that
// the AI returned, find the page each evidence snippet most likely came from.
// Matching is whitespace-collapsed, lowercased and accent-stripped, with
// first-match-wins. When a snippet doesn't match any page, the page is left
// undefined so the UI can fall back to a plain document download.

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findPageForSnippet(normalizedPages, snippet) {
  const needle = normalize(snippet);
  if (!needle) return undefined;
  // Probe progressively shorter substrings to absorb minor AI rewrites
  // (clipped suffixes, punctuation drift). We never go below 24 chars to
  // avoid false positives on very common bigrams.
  const probes = [needle];
  if (needle.length > 80) probes.push(needle.slice(0, 80));
  if (needle.length > 48) probes.push(needle.slice(0, 48));
  if (needle.length > 24) probes.push(needle.slice(0, 24));
  for (const probe of probes) {
    for (const page of normalizedPages) {
      if (page.text.includes(probe)) return page.num;
    }
  }
  return undefined;
}

/**
 * @param {{num: number, text: string}[]} pages
 * @param {Record<string, string> | null | undefined} fields
 * @returns {Record<string, { text: string, page?: number }>}
 */
export function tagFieldEvidence(pages, fields) {
  const normalizedPages = pages.map((p) => ({ num: p.num, text: normalize(p.text) }));
  const out = {};
  if (!fields || typeof fields !== 'object') return out;
  for (const [field, snippet] of Object.entries(fields)) {
    if (typeof snippet !== 'string' || !snippet.trim()) continue;
    const page = findPageForSnippet(normalizedPages, snippet);
    out[field] = page ? { text: snippet, page } : { text: snippet };
  }
  return out;
}

/**
 * @param {{num: number, text: string}[]} pages
 * @param {Array<Record<string, string>> | null | undefined} rentSteps
 * @returns {Array<Record<string, { text: string, page?: number }>>}
 */
export function tagRentStepEvidence(pages, rentSteps) {
  if (!Array.isArray(rentSteps)) return [];
  return rentSteps.map((step) => tagFieldEvidence(pages, step));
}

export function buildPageTaggedEvidence(pages, evidence, source) {
  return {
    fields: tagFieldEvidence(pages, evidence?.fields),
    rentSteps: tagRentStepEvidence(pages, evidence?.rentSteps),
    extractedAt: new Date().toISOString(),
    source,
  };
}

// Exposed for tests.
export { normalize as _normalize };
