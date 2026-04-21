import cors from 'cors';
import dns from 'node:dns/promises';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import fs from 'node:fs/promises';
import multer from 'multer';
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import { z } from 'zod';
import './env.js';
import { fetchFullState, getMeta, incrementRevision, replaceFullState, logActivity, getRecentActivities } from './db.js';
import { buildRichExtractionMessages } from './autofill/richPrompt.js';
import { applyPostDerivations } from './autofill/postDerivations.js';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = process.env.MALLIQ_DATA_DIR
  ? path.resolve(process.env.MALLIQ_DATA_DIR)
  : path.join(__dirname, 'data');
const TMP_DIR = path.join(DATA_DIR, 'tmp');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PORT = Number(process.env.PORT || 4000);

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_PROXY_REQUEST_BYTES = 512 * 1024;
const MAX_PROXY_RESPONSE_BYTES = 2 * 1024 * 1024;
const POS_PROXY_TIMEOUT_MS = 15000;
const DOCUMENT_ENTITY_TYPES = new Set(['asset', 'unit', 'contract']);
const DOCUMENT_KINDS = new Set([
  'contrato',
  'anexo',
  'carta_oferta',
  'cip',
  'foto',
  'render',
  'presupuesto',
  'forecast',
  'plano',
  'permiso',
  'otro',
]);
const POS_METHODS = new Set(['GET', 'POST']);

const ProxyPayloadSchema = z.object({
  endpoint: z.string().min(1),
  method: z.enum(['GET', 'POST']).optional(),
  token: z.string().optional(),
  requestBody: z.string().optional(),
});

const ArchivePutSchema = z.object({
  version: z.number().optional(),
  state: z.record(z.string(), z.unknown()).optional(),
  documents: z.array(z.unknown()).optional(),
  serverRevision: z.number().optional(),
  force: z.boolean().optional(),
}).passthrough();

const TEXT_EXTENSIONS = new Set(['.csv', '.json', '.log', '.txt', '.xml']);
const IMAGE_EXTENSIONS = new Set(['.bmp', '.gif', '.jpeg', '.jpg', '.png', '.tif', '.tiff', '.webp']);

const upload = multer({
  dest: TMP_DIR,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
});

function emptyState() {
  return {
    asset: null,
    units: [],
    contracts: [],
    sales: [],
    planning: [],
    documents: [],
    suppliers: [],
    prospects: [],
    posConnections: [],
    importLogs: [],
  };
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeState(state) {
  const normalized = isRecord(state) ? state : {};
  return {
    asset: isRecord(normalized.asset) ? normalized.asset : null,
    units: normalizeArray(normalized.units),
    contracts: normalizeArray(normalized.contracts),
    sales: normalizeArray(normalized.sales),
    planning: normalizeArray(normalized.planning),
    documents: normalizeArray(normalized.documents),
    suppliers: normalizeArray(normalized.suppliers),
    prospects: normalizeArray(normalized.prospects),
    posConnections: normalizeArray(normalized.posConnections),
    importLogs: normalizeArray(normalized.importLogs),
  };
}

function buildStateSummary(state) {
  const normalized = normalizeState(state);
  return {
    units: normalized.units.length,
    contracts: normalized.contracts.length,
    sales: normalized.sales.length,
    planning: normalized.planning.length,
    documents: normalized.documents.length,
    suppliers: normalized.suppliers.length,
    prospects: normalized.prospects.length,
    posConnections: normalized.posConnections.length,
    importLogs: normalized.importLogs.length,
  };
}

function hasMeaningfulState(state) {
  const summary = buildStateSummary(state);
  if (Object.values(summary).some((value) => value > 0)) {
    return true;
  }

  const asset = normalizeState(state).asset;
  return Boolean(
    asset &&
      (String(asset.name || '').trim() ||
        String(asset.city || '').trim() ||
        String(asset.region || '').trim() ||
        String(asset.notes || '').trim()),
  );
}

function sanitizeFilename(name) {
  return String(name || 'archivo').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function normalizeText(value, maxLength = 500) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function normalizeAutofillTextValue(value, maxLength = 500) {
  const normalized = normalizeText(value, maxLength);
  return normalized || null;
}

function normalizeAutofillEvidenceSnippet(value, maxLength = 600) {
  const normalized = normalizeText(value, maxLength);
  return normalized || null;
}

function parseLooseNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/\s+/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeMoneyValue(value, fallback = null) {
  const parsed = parseLooseNumber(value, Number.NaN);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.round(parsed));
}

function normalizeRateValue(value, fallback = null) {
  const parsed = parseLooseNumber(value, Number.NaN);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Number(parsed.toFixed(2)));
}

function normalizeIsoDate(value, fallback = null) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function normalizeLiteralMatchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%/.,-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const AUTOFILL_TOKEN_STOPWORDS = new Set([
  'del', 'las', 'los', 'para', 'por', 'con', 'sin', 'segun', 'según', 'una', 'uno', 'unos', 'unas',
  'que', 'como', 'entre', 'desde', 'hasta', 'sobre', 'este', 'esta', 'estos', 'estas', 'sera', 'será',
  'será', 'debe', 'debera', 'deberá', 'anual', 'mensual', 'pago', 'canon', 'renta', 'monto', 'fecha',
  'contrato', 'vigencia', 'plazo', 'clausula', 'cláusula', 'segun', 'reajuste', 'garantia', 'garantía',
]);

function tokenizeComparableText(value) {
  return normalizeLiteralMatchText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !AUTOFILL_TOKEN_STOPWORDS.has(token));
}

function buildNumberEvidenceKeys(value) {
  if (!Number.isFinite(value)) {
    return [];
  }

  const rounded = Number(value.toFixed(2));
  const keys = [rounded.toFixed(2)];
  if (Math.abs(rounded - Math.round(rounded)) < 0.005) {
    keys.push(String(Math.round(rounded)));
  }

  return [...new Set(keys)];
}

function normalizeEvidenceYear(rawYear) {
  const year = Number(rawYear);
  if (!Number.isInteger(year)) {
    return null;
  }

  if (rawYear.length === 2) {
    return year >= 70 ? 1900 + year : 2000 + year;
  }

  return year;
}

function toIsoDateFromParts(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractExplicitIsoDates(sourceText) {
  const dates = new Set();
  const numericDatePattern = /\b(\d{1,4})[\/.-](\d{1,2})[\/.-](\d{1,4})\b/g;
  const spanishMonths = {
    enero: 1,
    feb: 2,
    febrero: 2,
    mar: 3,
    marzo: 3,
    abr: 4,
    abril: 4,
    may: 5,
    mayo: 5,
    jun: 6,
    junio: 6,
    jul: 7,
    julio: 7,
    ago: 8,
    agosto: 8,
    sep: 9,
    sept: 9,
    septiembre: 9,
    setiembre: 9,
    oct: 10,
    octubre: 10,
    nov: 11,
    noviembre: 11,
    dic: 12,
    diciembre: 12,
  };
  const longDatePattern = /\b(\d{1,2})\s+de\s+(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|sept|setiembre|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\s+de\s+(\d{2,4})\b/gi;

  for (const match of sourceText.matchAll(numericDatePattern)) {
    const [, left, middle, right] = match;
    const year = left.length === 4 ? Number(left) : normalizeEvidenceYear(right);
    const month = Number(middle);
    const day = left.length === 4 ? Number(right) : Number(left);
    const isoDate = toIsoDateFromParts(year, month, day);
    if (isoDate) {
      dates.add(isoDate);
    }
  }

  for (const match of sourceText.matchAll(longDatePattern)) {
    const [, rawDay, rawMonth, rawYear] = match;
    const month = spanishMonths[rawMonth.toLowerCase()];
    const isoDate = toIsoDateFromParts(normalizeEvidenceYear(rawYear), month, Number(rawDay));
    if (isoDate) {
      dates.add(isoDate);
    }
  }

  return dates;
}

function extractExplicitDateMatches(sourceText) {
  const matches = [];
  const numericDatePattern = /\b(\d{1,4})[\/.-](\d{1,2})[\/.-](\d{1,4})\b/g;
  const spanishMonths = {
    enero: 1,
    feb: 2,
    febrero: 2,
    mar: 3,
    marzo: 3,
    abr: 4,
    abril: 4,
    may: 5,
    mayo: 5,
    jun: 6,
    junio: 6,
    jul: 7,
    julio: 7,
    ago: 8,
    agosto: 8,
    sep: 9,
    sept: 9,
    septiembre: 9,
    setiembre: 9,
    oct: 10,
    octubre: 10,
    nov: 11,
    noviembre: 11,
    dic: 12,
    diciembre: 12,
  };
  const longDatePattern = /\b(\d{1,2})\s+de\s+(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|sept|setiembre|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\s+de\s+(\d{2,4})\b/gi;

  for (const match of sourceText.matchAll(numericDatePattern)) {
    const [, left, middle, right] = match;
    const year = left.length === 4 ? Number(left) : normalizeEvidenceYear(right);
    const month = Number(middle);
    const day = left.length === 4 ? Number(right) : Number(left);
    const isoDate = toIsoDateFromParts(year, month, day);
    if (isoDate) {
      matches.push({
        isoDate,
        literal: match[0].trim(),
      });
    }
  }

  for (const match of sourceText.matchAll(longDatePattern)) {
    const [, rawDay, rawMonth, rawYear] = match;
    const month = spanishMonths[rawMonth.toLowerCase()];
    const isoDate = toIsoDateFromParts(normalizeEvidenceYear(rawYear), month, Number(rawDay));
    if (isoDate) {
      matches.push({
        isoDate,
        literal: match[0].trim(),
      });
    }
  }

  return matches;
}

function extractExplicitNumbers(sourceText, requirePercent = false) {
  const numbers = new Set();
  const numericPattern = /-?\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d+)?\s*%?|-?\d+(?:[.,]\d+)?\s*%?/g;

  for (const match of sourceText.matchAll(numericPattern)) {
    const token = match[0].trim();
    const hasPercent = token.includes('%');
    if (requirePercent && !hasPercent) {
      continue;
    }

    const value = parseLooseNumber(token.replace('%', ''), Number.NaN);
    if (!Number.isFinite(value)) {
      continue;
    }

    buildNumberEvidenceKeys(value).forEach((key) => numbers.add(key));
  }

  return numbers;
}

function extractNumberCandidates(sourceText, requirePercent = false) {
  const numbers = [];
  const numericPattern = /-?\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d+)?\s*%?|-?\d+(?:[.,]\d+)?\s*%?/g;

  for (const match of sourceText.matchAll(numericPattern)) {
    const token = match[0].trim();
    const hasPercent = token.includes('%');
    if (requirePercent && !hasPercent) {
      continue;
    }

    const value = parseLooseNumber(token.replace('%', ''), Number.NaN);
    if (Number.isFinite(value)) {
      numbers.push(value);
    }
  }

  return numbers;
}

function findLiteralDateSnippet(sourceText, isoDate) {
  if (!isoDate || typeof sourceText !== 'string') {
    return null;
  }

  const match = extractExplicitDateMatches(sourceText).find((candidate) => candidate.isoDate === isoDate);
  return match?.literal ?? null;
}

function findLiteralNumberSnippet(sourceText, value, { requirePercent = false, tolerance = 0.01 } = {}) {
  if (!Number.isFinite(value) || typeof sourceText !== 'string') {
    return null;
  }

  const numericSnippetPattern = /\$?\s*-?\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d+)?(?:\s*(?:%|UF\/m2|UF\/m²|UF\/m\^2|UF|CLP|pesos?))?/gi;
  for (const match of sourceText.matchAll(numericSnippetPattern)) {
    const token = match[0].trim();
    const hasPercent = token.includes('%');
    if (requirePercent && !hasPercent) {
      continue;
    }

    const numericPortion = token.replace(/^\$\s*/, '').match(/-?\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d+)?|-?\d+(?:[.,]\d+)?/);
    const candidate = parseLooseNumber(numericPortion?.[0] ?? '', Number.NaN);
    if (Number.isFinite(candidate) && numbersApproximatelyMatch(candidate, value, tolerance)) {
      return token;
    }
  }

  return null;
}

function detectRentEvidenceFormat(snippet) {
  const rawSnippet = typeof snippet === 'string' ? snippet : '';
  if (!rawSnippet.trim()) {
    return null;
  }

  const normalized = normalizeLiteralMatchText(rawSnippet);
  const hasUF = /\buf\b/.test(normalized) || normalized.includes('u.f');
  const hasClp = rawSnippet.includes('$') || /\bclp\b|\bpeso\b|\bpesos\b/.test(normalized);
  const hasPerSquareMeter = /\/m2|\/m²|\/m\^2|\bpor m2\b|\bpor m²\b|\bm2\b|\bm²\b|\bmetro cuadrado\b|\bmetros cuadrados\b/.test(normalized);

  if (hasUF && hasPerSquareMeter) {
    return 'uf_m2';
  }

  if (hasClp) {
    return 'clp_total';
  }

  if (hasUF) {
    return 'uf_total';
  }

  return null;
}

function normalizeDurationUnit(rawUnit) {
  const unit = normalizeLiteralMatchText(rawUnit);
  if (unit.startsWith('ano') || unit.startsWith('anos')) {
    return 'years';
  }
  if (unit.startsWith('mes')) {
    return 'months';
  }
  if (unit.startsWith('dia')) {
    return 'days';
  }
  return null;
}

function toIsoDateFromUtcDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function addDurationToIsoDate(startDate, value, unit) {
  const normalizedStartDate = normalizeIsoDate(startDate);
  if (!normalizedStartDate || !Number.isInteger(value) || value <= 0 || !unit) {
    return null;
  }

  const [year, month, day] = normalizedStartDate.split('-').map(Number);
  const endDate = new Date(Date.UTC(year, month - 1, day));

  if (unit === 'days') {
    endDate.setUTCDate(endDate.getUTCDate() + value - 1);
    return toIsoDateFromUtcDate(endDate);
  }

  if (unit === 'months') {
    endDate.setUTCMonth(endDate.getUTCMonth() + value);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
    return toIsoDateFromUtcDate(endDate);
  }

  if (unit === 'years') {
    endDate.setUTCFullYear(endDate.getUTCFullYear() + value);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
    return toIsoDateFromUtcDate(endDate);
  }

  return null;
}

function findDurationClause(sourceText) {
  if (typeof sourceText !== 'string' || !sourceText.trim()) {
    return null;
  }

  const patterns = [
    /\b(?:plazo|vigencia|duraci[oó]n|t[eé]rmino)\b[^.\n]{0,120}?\b(\d{1,3})\s+(a(?:ñ|n)o?s?|meses|d[ií]as?)\b/gi,
    /\b(?:por|durante)\s+un?\s+plazo\s+de\s+(\d{1,3})\s+(a(?:ñ|n)o?s?|meses|d[ií]as?)\b/gi,
    /\b(?:por|durante)\s+(\d{1,3})\s+(a(?:ñ|n)o?s?|meses|d[ií]as?)\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of sourceText.matchAll(pattern)) {
      const value = Number(match[1]);
      const unit = normalizeDurationUnit(match[2]);
      if (Number.isInteger(value) && value > 0 && unit) {
        return {
          value,
          unit,
          literal: normalizeAutofillEvidenceSnippet(match[0], 200),
        };
      }
    }
  }

  return null;
}

function deriveEndDateFromDuration(sourceText, startDate) {
  if (!startDate) {
    return null;
  }

  const durationClause = findDurationClause(sourceText);
  if (!durationClause) {
    return null;
  }

  const endDate = addDurationToIsoDate(startDate, durationClause.value, durationClause.unit);
  if (!endDate) {
    return null;
  }

  return {
    endDate,
    evidence: durationClause.literal,
  };
}

function buildAutofillEvidence(sourceText) {
  const rawText = typeof sourceText === 'string' ? sourceText : '';
  return {
    normalizedText: normalizeLiteralMatchText(rawText),
    dates: extractExplicitIsoDates(rawText),
    numbers: extractExplicitNumbers(rawText),
    percentages: extractExplicitNumbers(rawText, true),
  };
}

function hasLiteralTextEvidence(evidence, value) {
  if (!value) {
    return false;
  }

  const candidate = normalizeLiteralMatchText(value);
  return candidate.length >= 3 && evidence.normalizedText.includes(candidate);
}

function hasLiteralNumberEvidence(evidence, value) {
  if (!Number.isFinite(value) || value <= 0) {
    return false;
  }

  return buildNumberEvidenceKeys(value).some((key) => evidence.has(key));
}

function hasLiteralDateEvidence(evidence, value) {
  if (!value) {
    return false;
  }

  return evidence.dates.has(value);
}

function hasEvidenceSnippetInSource(evidence, snippet) {
  if (!snippet) {
    return false;
  }

  const candidate = normalizeLiteralMatchText(snippet);
  return candidate.length >= 6 && evidence.normalizedText.includes(candidate);
}

function hasComparableTokenOverlap(value, snippet, minimumMatches = 1) {
  const valueTokens = tokenizeComparableText(value);
  if (valueTokens.length === 0) {
    return false;
  }

  const snippetTokens = new Set(tokenizeComparableText(snippet));
  let matches = 0;
  for (const token of valueTokens) {
    if (snippetTokens.has(token)) {
      matches += 1;
    }
  }

  return matches >= minimumMatches;
}

function numbersApproximatelyMatch(left, right, tolerance = 0.01) {
  return Math.abs(left - right) <= tolerance;
}

function resolveNumberFromEvidence(rawValue, evidenceSnippet, { requirePercent = false, round = false } = {}) {
  const normalizedValue = round ? normalizeMoneyValue(rawValue) : normalizeRateValue(rawValue);
  if (!evidenceSnippet) {
    return normalizedValue;
  }

  const candidates = evidenceSnippet ? extractNumberCandidates(evidenceSnippet, requirePercent) : [];
  if (normalizedValue != null && candidates.some((candidate) => numbersApproximatelyMatch(candidate, normalizedValue, round ? 1 : 0.01))) {
    return normalizedValue;
  }

  const fallbackCandidate = candidates[0];
  if (!Number.isFinite(fallbackCandidate)) {
    return null;
  }

  return round ? normalizeMoneyValue(fallbackCandidate) : normalizeRateValue(fallbackCandidate);
}

function resolveDateFromEvidence(rawValue, evidenceSnippet) {
  const normalizedValue = normalizeIsoDate(rawValue);
  if (!evidenceSnippet) {
    return normalizedValue;
  }

  const dates = evidenceSnippet ? [...extractExplicitIsoDates(evidenceSnippet)] : [];
  if (normalizedValue && dates.includes(normalizedValue)) {
    return normalizedValue;
  }

  return dates[0] ?? null;
}

function resolveTextFromEvidence(rawValue, evidenceSnippet, { requireOverlap = true } = {}) {
  const normalizedValue = normalizeAutofillTextValue(rawValue);
  if (!normalizedValue || !evidenceSnippet) {
    return null;
  }

  if (!requireOverlap) {
    return normalizedValue;
  }

  return hasComparableTokenOverlap(normalizedValue, evidenceSnippet) ? normalizedValue : null;
}

function buildEmptyAutofill(source = 'ai') {
  return {
    companyName: null,
    storeName: null,
    category: null,
    baseRentUF: null,
    fixedRent: null,
    variableRentPct: null,
    commonExpenses: null,
    fondoPromocion: null,
    escalation: null,
    startDate: null,
    endDate: null,
    garantiaMonto: null,
    garantiaVencimiento: null,
    feeIngreso: null,
    evidence: {},
    rentSteps: [],
    mocked: false,
    source,
  };
}

function normalizeRentSteps(rawSteps, evidence, sourceText) {
  if (!Array.isArray(rawSteps)) {
    return [];
  }

  return rawSteps
    .map((step, index) => {
      const raw = isRecord(step) ? step : {};
      const rawEvidence = isRecord(raw.evidence) ? raw.evidence : {};
      const startDateEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.startDate);
      const endDateEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.endDate);
      const rentaEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.rentaFijaUfM2 ?? rawEvidence.baseRentUF ?? rawEvidence.baseRentUf);
      const startDate = resolveDateFromEvidence(raw.startDate, startDateEvidence);
      const endDate = resolveDateFromEvidence(raw.endDate, endDateEvidence);
      const rentaFijaUfM2 = resolveNumberFromEvidence(raw.rentaFijaUfM2 ?? raw.baseRentUF ?? raw.baseRentUf, rentaEvidence);
      const acceptedStartDateEvidence = startDateEvidence ?? findLiteralDateSnippet(sourceText, startDate);
      const acceptedEndDateEvidence = endDateEvidence ?? findLiteralDateSnippet(sourceText, endDate);
      const acceptedRentaEvidence = rentaEvidence ?? findLiteralNumberSnippet(sourceText, rentaFijaUfM2);
      const hasStartSupport = acceptedStartDateEvidence ? hasEvidenceSnippetInSource(evidence, acceptedStartDateEvidence) : hasLiteralDateEvidence(evidence, startDate);
      const hasEndSupport = acceptedEndDateEvidence ? hasEvidenceSnippetInSource(evidence, acceptedEndDateEvidence) : hasLiteralDateEvidence(evidence, endDate);
      const hasRentSupport = acceptedRentaEvidence ? hasEvidenceSnippetInSource(evidence, acceptedRentaEvidence) : hasLiteralNumberEvidence(evidence.numbers, rentaFijaUfM2);
      if (
        !startDate ||
        !endDate ||
        !hasStartSupport ||
        !hasEndSupport ||
        !hasRentSupport
      ) {
        return null;
      }

      return {
        id: normalizeText(raw.id, 100) || `step-${index + 1}`,
        startDate,
        endDate,
        rentaFijaUfM2,
        evidence: {
          ...(hasStartSupport && acceptedStartDateEvidence ? { startDate: acceptedStartDateEvidence } : {}),
          ...(hasEndSupport && acceptedEndDateEvidence ? { endDate: acceptedEndDateEvidence } : {}),
          ...(hasRentSupport && acceptedRentaEvidence ? { rentaFijaUfM2: acceptedRentaEvidence } : {}),
        },
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.startDate.localeCompare(right.startDate));
}

const AUTOFILL_REVIEW_FIELDS = [
  'companyName',
  'storeName',
  'category',
  'baseRentUF',
  'fixedRent',
  'variableRentPct',
  'commonExpenses',
  'fondoPromocion',
  'escalation',
  'startDate',
  'endDate',
  'garantiaMonto',
  'garantiaVencimiento',
  'feeIngreso',
];

function buildMissingAutofillFields(result) {
  return AUTOFILL_REVIEW_FIELDS.filter((field) => result[field] == null);
}

function buildAcceptedAutofillFieldEvidence(result, raw, rawEvidence, evidence, sourceText) {
  const fieldDefinitions = [
    ['companyName', rawEvidence.companyName, raw.companyName, result.companyName, hasLiteralTextEvidence],
    ['storeName', rawEvidence.storeName, raw.storeName, result.storeName, hasLiteralTextEvidence],
    ['category', rawEvidence.category, raw.category, result.category, hasLiteralTextEvidence],
    ['baseRentUF', rawEvidence.baseRentUF ?? rawEvidence.baseRentUf, null, result.baseRentUF, hasLiteralTextEvidence],
    ['fixedRent', rawEvidence.fixedRent, null, result.fixedRent, hasLiteralTextEvidence],
    ['variableRentPct', rawEvidence.variableRentPct, null, result.variableRentPct, hasLiteralTextEvidence],
    ['commonExpenses', rawEvidence.commonExpenses, null, result.commonExpenses, hasLiteralTextEvidence],
    ['fondoPromocion', rawEvidence.fondoPromocion, null, result.fondoPromocion, hasLiteralTextEvidence],
    ['escalation', rawEvidence.escalation, raw.escalation, result.escalation, hasLiteralTextEvidence],
    ['startDate', rawEvidence.startDate, null, result.startDate, hasLiteralTextEvidence],
    ['endDate', rawEvidence.endDate, null, result.endDate, hasLiteralTextEvidence],
    ['garantiaMonto', rawEvidence.garantiaMonto, null, result.garantiaMonto, hasLiteralTextEvidence],
    ['garantiaVencimiento', rawEvidence.garantiaVencimiento, null, result.garantiaVencimiento, hasLiteralTextEvidence],
    ['feeIngreso', rawEvidence.feeIngreso, null, result.feeIngreso, hasLiteralTextEvidence],
  ];

  return fieldDefinitions.reduce((accumulator, [field, snippetCandidate, fallbackRawValue, acceptedValue, literalMatcher]) => {
    if (acceptedValue == null) {
      return accumulator;
    }

    const snippet = normalizeAutofillEvidenceSnippet(snippetCandidate);
    if (snippet && hasEvidenceSnippetInSource(evidence, snippet)) {
      accumulator[field] = snippet;
      return accumulator;
    }

    if (typeof fallbackRawValue === 'string' && literalMatcher(evidence, fallbackRawValue)) {
      accumulator[field] = normalizeAutofillEvidenceSnippet(fallbackRawValue);
      return accumulator;
    }

    if (typeof acceptedValue === 'string' && literalMatcher(evidence, acceptedValue)) {
      accumulator[field] = normalizeAutofillEvidenceSnippet(acceptedValue);
      return accumulator;
    }

    if (typeof acceptedValue === 'number') {
      const derivedSnippet = findLiteralNumberSnippet(sourceText, acceptedValue, {
        requirePercent: field === 'variableRentPct',
        tolerance: field === 'fixedRent' || field === 'commonExpenses' || field === 'fondoPromocion' || field === 'garantiaMonto' || field === 'feeIngreso' ? 1 : 0.01,
      });
      if (derivedSnippet) {
        accumulator[field] = derivedSnippet;
        return accumulator;
      }
    }

    if (field === 'startDate' || field === 'endDate' || field === 'garantiaVencimiento') {
      const derivedSnippet = findLiteralDateSnippet(sourceText, acceptedValue);
      if (derivedSnippet) {
        accumulator[field] = derivedSnippet;
      }
    }

    return accumulator;
  }, {});
}

function applyDeterministicAutofillDerivations(result, raw, rawEvidence, sourceText, evidence) {
  const next = { ...result };
  const evidenceOverrides = {};
  const fixedRentEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.fixedRent);
  const baseRentEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.baseRentUF ?? rawEvidence.baseRentUf);
  const fixedRentFormat = detectRentEvidenceFormat(fixedRentEvidence);
  const baseRentFormat = detectRentEvidenceFormat(baseRentEvidence);

  if (fixedRentFormat === 'uf_m2' && fixedRentEvidence && hasEvidenceSnippetInSource(evidence, fixedRentEvidence)) {
    const derivedBaseRentUF = resolveNumberFromEvidence(raw.fixedRent, fixedRentEvidence);
    if (derivedBaseRentUF != null) {
      next.baseRentUF = derivedBaseRentUF;
      next.fixedRent = null;
      evidenceOverrides.baseRentUF = fixedRentEvidence;
    }
  }

  if (baseRentFormat === 'clp_total' && baseRentEvidence && hasEvidenceSnippetInSource(evidence, baseRentEvidence)) {
    const derivedFixedRent = resolveNumberFromEvidence(raw.baseRentUF ?? raw.baseRentUf, baseRentEvidence, { round: true });
    if (derivedFixedRent != null) {
      next.fixedRent = derivedFixedRent;
      next.baseRentUF = null;
      evidenceOverrides.fixedRent = baseRentEvidence;
    }
  }

  if (!next.endDate && next.startDate) {
    const derivedEndDate = deriveEndDateFromDuration(sourceText, next.startDate);
    if (derivedEndDate) {
      next.endDate = derivedEndDate.endDate;
      if (derivedEndDate.evidence) {
        evidenceOverrides.endDate = derivedEndDate.evidence;
      }
    }
  }

  return { result: next, evidenceOverrides };
}

export function normalizeContractAutofillResult(payload, sourceText, source) {
  const base = buildEmptyAutofill(source);
  const raw = isRecord(payload) ? payload : {};
  const evidence = buildAutofillEvidence(sourceText);
  const rawEvidence = isRecord(raw.evidence) ? raw.evidence : {};
  const companyNameEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.companyName);
  const storeNameEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.storeName);
  const categoryEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.category);
  const baseRentUFEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.baseRentUF ?? rawEvidence.baseRentUf);
  const fixedRentEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.fixedRent);
  const variableRentPctEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.variableRentPct);
  const commonExpensesEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.commonExpenses);
  const fondoPromocionEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.fondoPromocion);
  const escalationEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.escalation);
  const startDateEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.startDate);
  const endDateEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.endDate);
  const garantiaMontoEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.garantiaMonto);
  const garantiaVencimientoEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.garantiaVencimiento);
  const feeIngresoEvidence = normalizeAutofillEvidenceSnippet(rawEvidence.feeIngreso);
  const companyName = normalizeAutofillTextValue(raw.companyName, 200);
  const storeName = normalizeAutofillTextValue(raw.storeName, 200);
  const category = normalizeAutofillTextValue(raw.category, 150);
  const escalation = normalizeAutofillTextValue(raw.escalation, 200);
  const startDate = resolveDateFromEvidence(raw.startDate, startDateEvidence);
  const endDate = resolveDateFromEvidence(raw.endDate, endDateEvidence);
  const garantiaVencimiento = resolveDateFromEvidence(raw.garantiaVencimiento, garantiaVencimientoEvidence);
  const baseRentUF = resolveNumberFromEvidence(raw.baseRentUF ?? raw.baseRentUf, baseRentUFEvidence);
  const fixedRent = resolveNumberFromEvidence(raw.fixedRent, fixedRentEvidence, { round: true });
  const variableRentPct = resolveNumberFromEvidence(raw.variableRentPct, variableRentPctEvidence, { requirePercent: true });
  const commonExpenses = resolveNumberFromEvidence(raw.commonExpenses, commonExpensesEvidence, { round: true });
  const fondoPromocion = resolveNumberFromEvidence(raw.fondoPromocion, fondoPromocionEvidence, { round: true });
  const garantiaMonto = resolveNumberFromEvidence(raw.garantiaMonto, garantiaMontoEvidence, { round: true });
  const feeIngreso = resolveNumberFromEvidence(raw.feeIngreso, feeIngresoEvidence, { round: true });

  const result = {
    ...base,
    companyName:
      hasEvidenceSnippetInSource(evidence, companyNameEvidence)
        ? resolveTextFromEvidence(companyName, companyNameEvidence)
        : hasLiteralTextEvidence(evidence, companyName) ? companyName : base.companyName,
    storeName:
      hasEvidenceSnippetInSource(evidence, storeNameEvidence)
        ? resolveTextFromEvidence(storeName, storeNameEvidence)
        : hasLiteralTextEvidence(evidence, storeName) ? storeName : base.storeName,
    category:
      hasEvidenceSnippetInSource(evidence, categoryEvidence)
        ? resolveTextFromEvidence(category, categoryEvidence, { requireOverlap: false })
        : hasLiteralTextEvidence(evidence, category) ? category : base.category,
    baseRentUF:
      hasEvidenceSnippetInSource(evidence, baseRentUFEvidence)
        ? baseRentUF
        : hasLiteralNumberEvidence(evidence.numbers, baseRentUF) ? baseRentUF : base.baseRentUF,
    fixedRent:
      hasEvidenceSnippetInSource(evidence, fixedRentEvidence)
        ? fixedRent
        : hasLiteralNumberEvidence(evidence.numbers, fixedRent) ? fixedRent : base.fixedRent,
    variableRentPct:
      hasEvidenceSnippetInSource(evidence, variableRentPctEvidence)
        ? variableRentPct
        : hasLiteralNumberEvidence(evidence.percentages, variableRentPct) ? variableRentPct : base.variableRentPct,
    commonExpenses:
      hasEvidenceSnippetInSource(evidence, commonExpensesEvidence)
        ? commonExpenses
        : hasLiteralNumberEvidence(evidence.numbers, commonExpenses) ? commonExpenses : base.commonExpenses,
    fondoPromocion:
      hasEvidenceSnippetInSource(evidence, fondoPromocionEvidence)
        ? fondoPromocion
        : hasLiteralNumberEvidence(evidence.numbers, fondoPromocion) ? fondoPromocion : base.fondoPromocion,
    escalation:
      hasEvidenceSnippetInSource(evidence, escalationEvidence)
        ? resolveTextFromEvidence(escalation, escalationEvidence, { requireOverlap: false })
        : hasLiteralTextEvidence(evidence, escalation) ? escalation : base.escalation,
    startDate:
      hasEvidenceSnippetInSource(evidence, startDateEvidence)
        ? startDate
        : hasLiteralDateEvidence(evidence, startDate) ? startDate : base.startDate,
    endDate:
      hasEvidenceSnippetInSource(evidence, endDateEvidence)
        ? endDate
        : hasLiteralDateEvidence(evidence, endDate) ? endDate : base.endDate,
    garantiaMonto:
      hasEvidenceSnippetInSource(evidence, garantiaMontoEvidence)
        ? garantiaMonto
        : hasLiteralNumberEvidence(evidence.numbers, garantiaMonto) ? garantiaMonto : base.garantiaMonto,
    garantiaVencimiento:
      hasEvidenceSnippetInSource(evidence, garantiaVencimientoEvidence)
        ? garantiaVencimiento
        : hasLiteralDateEvidence(evidence, garantiaVencimiento) ? garantiaVencimiento : base.garantiaVencimiento,
    feeIngreso:
      hasEvidenceSnippetInSource(evidence, feeIngresoEvidence)
        ? feeIngreso
        : hasLiteralNumberEvidence(evidence.numbers, feeIngreso) ? feeIngreso : base.feeIngreso,
    rentSteps: normalizeRentSteps(raw.rentSteps, evidence, sourceText),
    mocked: source === 'mock_local',
    source,
  };

  const { result: resolvedResult, evidenceOverrides } = applyDeterministicAutofillDerivations(
    result,
    raw,
    rawEvidence,
    sourceText,
    evidence,
  );

  return {
    ...resolvedResult,
    evidence: {
      ...buildAcceptedAutofillFieldEvidence(resolvedResult, raw, rawEvidence, evidence, sourceText),
      ...evidenceOverrides,
    },
    missingFields: buildMissingAutofillFields(resolvedResult),
  };
}

function getContractAutofillAiConfig() {
  if (process.env.MOONSHOT_API_KEY) {
    return {
      provider: 'moonshot',
      apiKey: process.env.MOONSHOT_API_KEY,
      baseURL: process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.ai/v1',
      model: process.env.CONTRACT_AUTOFILL_MODEL || 'kimi-k2.5',
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
      model: process.env.CONTRACT_AUTOFILL_MODEL || 'gpt-4o-mini',
    };
  }

  return null;
}

function shouldDisableMoonshotThinking(aiConfig) {
  return aiConfig.provider === 'moonshot' && /^kimi-k2\.5(?:$|[-])/i.test(aiConfig.model);
}

export function buildContractAutofillCompletionRequest(aiConfig, messages) {
  const request = {
    model: aiConfig.model,
    messages,
  };

  if (aiConfig.provider === 'moonshot') {
    if (shouldDisableMoonshotThinking(aiConfig)) {
      request.extra_body = {
        thinking: { type: 'disabled' },
      };
    }

    return request;
  }

  return {
    ...request,
    temperature: 0,
  };
}

async function ensureStorage() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.mkdir(TMP_DIR, { recursive: true });
}

async function discardTempFile(filePath) {
  if (!filePath) {
    return;
  }

  await fs.rm(filePath, { force: true }).catch(() => {});
}

async function loadState() {
  return normalizeState(await fetchFullState());
}

async function saveState(state) {
  await replaceFullState(normalizeState(state));
}

async function loadMeta() {
  return await getMeta();
}

async function touchRevision() {
  return await incrementRevision();
}

function getDocumentAbsolutePath(record) {
  return path.join(UPLOADS_DIR, `${record.id}-${sanitizeFilename(record.name)}`);
}

async function blobFileToDataUrl(filePath, mimeType) {
  const buffer = await fs.readFile(filePath);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function dataUrlToBuffer(dataUrl) {
  const [, base64 = ''] = String(dataUrl || '').split(',');
  return Buffer.from(base64, 'base64');
}

async function buildArchive() {
  const state = await loadState();
  const meta = await loadMeta();
  const documents = await Promise.all(
    state.documents.map(async (record) => {
      const filePath = getDocumentAbsolutePath(record);
      try {
        const dataUrl = await blobFileToDataUrl(filePath, record.mimeType || 'application/octet-stream');
        return { record, dataUrl };
      } catch {
        return { record };
      }
    }),
  );

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    state,
    documents,
    serverRevision: Number(meta?.revision || 0),
  };
}

async function clearUploads() {
  await ensureStorage();
  const files = await fs.readdir(UPLOADS_DIR).catch(() => []);
  await Promise.all(files.map((file) => fs.rm(path.join(UPLOADS_DIR, file), { force: true })));
}

async function applyArchive(archive) {
  if (!isRecord(archive)) {
    throw new Error('Archivo de respaldo inválido.');
  }

  if ('version' in archive && archive.version !== 1) {
    throw new Error('Versión de respaldo no soportada.');
  }

  const normalizedState = normalizeState(archive.state);
  const meta = await loadMeta();
  const expectedRevision = Number(archive.serverRevision);
  const force = archive.force === true;

  if (!force && Number.isFinite(expectedRevision) && expectedRevision !== Number(meta.revision || 0)) {
    const conflict = new Error('Revision conflict');
    conflict.code = 'REVISION_CONFLICT';
    throw conflict;
  }

  await clearUploads();

  for (const item of normalizeArray(archive.documents)) {
    if (!isRecord(item) || !isRecord(item.record) || typeof item.dataUrl !== 'string' || !item.dataUrl.startsWith('data:')) {
      continue;
    }

    const filename = `${item.record.id}-${sanitizeFilename(item.record.name)}`;
    await fs.writeFile(path.join(UPLOADS_DIR, filename), dataUrlToBuffer(item.dataUrl));
  }

  normalizedState.documents = normalizedState.documents.map((record) => ({
    ...record,
    storage: 'remote',
    remotePath: `/api/documents/${record.id}/download`,
  }));
  if (normalizedState.asset) {
    normalizedState.asset.lastSyncedAt = new Date().toISOString();
    normalizedState.asset.syncStatus = 'online';
    normalizedState.asset.syncMessage = 'Estado remoto aplicado correctamente.';
  }

  await saveState(normalizedState);
  return touchRevision();
}

async function saveUploadedFile(file, record) {
  await ensureStorage();
  const targetName = `${record.id}-${sanitizeFilename(record.name)}`;
  const targetPath = path.join(UPLOADS_DIR, targetName);
  await fs.copyFile(file.path, targetPath);
  await discardTempFile(file.path);
  return targetName;
}

function validateDocumentPayload(body) {
  const id = normalizeText(body?.id, 120);
  const entityType = normalizeText(body?.entityType, 40);
  const entityId = normalizeText(body?.entityId, 120);
  const kind = normalizeText(body?.kind, 40);

  if (!id || !entityId) {
    throw new Error('ID de documento y entidad requeridos.');
  }
  if (!DOCUMENT_ENTITY_TYPES.has(entityType)) {
    throw new Error('Tipo de entidad documental no soportado.');
  }
  if (!DOCUMENT_KINDS.has(kind)) {
    throw new Error('Tipo de documento no soportado.');
  }

  return {
    id,
    entityType,
    entityId,
    kind,
    note: normalizeText(body?.note, 2000) || undefined,
  };
}

function buildProxyHeaders(token, requestBody) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(requestBody
      ? {
          'Content-Type': /^[\[{]/.test(requestBody.trim()) ? 'application/json' : 'text/plain; charset=utf-8',
        }
      : {}),
  };
}

function validateProxyPayload(body) {
  const endpoint = normalizeText(body?.endpoint, 2048);
  const method = normalizeText(body?.method || 'GET', 10).toUpperCase();
  const token = normalizeText(body?.token, 2000) || undefined;
  const requestBody = typeof body?.requestBody === 'string' ? body.requestBody : undefined;

  if (!endpoint) {
    throw new Error('Endpoint requerido.');
  }
  if (!POS_METHODS.has(method)) {
    throw new Error('Método no soportado. Usa GET o POST.');
  }
  if (requestBody && Buffer.byteLength(requestBody, 'utf8') > MAX_PROXY_REQUEST_BYTES) {
    throw new Error('El body del proxy excede el tamaño permitido.');
  }

  return { endpoint, method, token, requestBody };
}

function isBlockedHostname(hostname) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '0.0.0.0' ||
    normalized === '::1' ||
    normalized.endsWith('.local')
  );
}

function isPrivateIpv4(address) {
  const octets = address.split('.').map((value) => Number(value));
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return true;
  }

  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIpAddress(address) {
  if (!address) {
    return true;
  }

  const normalized = address.toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    return isPrivateIpAddress(normalized.slice(7));
  }

  const version = net.isIP(normalized);
  if (version === 4) {
    return isPrivateIpv4(normalized);
  }

  if (version === 6) {
    return (
      normalized === '::1' ||
      normalized === '::' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80:')
    );
  }

  return true;
}

async function isAllowedEndpoint(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    if (isBlockedHostname(parsed.hostname)) {
      return false;
    }

    const directIpVersion = net.isIP(parsed.hostname);
    if (directIpVersion > 0) {
      return !isPrivateIpAddress(parsed.hostname);
    }

    const resolvedAddresses = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
    if (resolvedAddresses.length === 0) {
      return false;
    }

    return resolvedAddresses.every((entry) => !isPrivateIpAddress(entry.address));
  } catch {
    return false;
  }
}

async function extractUploadedText(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const mimeType = String(file.mimetype || '').toLowerCase();

  if (mimeType === 'application/pdf' || extension === '.pdf') {
    const buffer = await fs.readFile(file.path);
    const parser = new PDFParse({ data: buffer });
    try {
      const pdfData = await parser.getText();
      return String(pdfData.text || '').trim();
    } finally {
      await parser.destroy().catch(() => {});
    }
  }

  if (mimeType.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) {
    const Tesseract = await import('tesseract.js');
    const result = await Tesseract.recognize(file.path, 'spa+eng');
    return String(result.data?.text || '').trim();
  }

  if (mimeType.startsWith('text/') || TEXT_EXTENSIONS.has(extension) || mimeType === 'application/json') {
    return (await fs.readFile(file.path, 'utf8')).trim();
  }

  throw new Error('Tipo de archivo no soportado para ingestión textual.');
}

function extractJsonObject(rawOutput) {
  const cleaned = String(rawOutput || '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : cleaned;
}

function createAppInstance() {
  const app = express();
  if (process.env.NODE_ENV === 'production' && process.env.ALLOWED_ORIGINS) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
    app.use(cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('No permitido por CORS'));
        }
      },
    }));
  } else {
    app.use(cors());
  }

  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(generalLimiter);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });

  const autofillLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const PROD_API_KEY = process.env.API_KEY || null;

  app.use('/api', (req, res, next) => {
    if (!PROD_API_KEY) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${PROD_API_KEY}`) {
      return res.status(401).json({ error: 'No autorizado. Provee el API_KEY en la variable de entorno.' });
    }
    next();
  });

  app.get('/api/health', async (_request, response) => {
    try {
      const state = await loadState();
      const meta = await loadMeta();
      response.json({
        ok: true,
        archiveExists: hasMeaningfulState(state),
        updatedAt: meta.updatedAt ?? state.asset?.lastSyncedAt ?? null,
        revision: Number(meta.revision || 0),
        aiMode: getContractAutofillAiConfig()?.provider ?? 'mock_local',
        summary: buildStateSummary(state),
      });
    } catch (error) {
      response.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'unknown' });
    }
  });

  app.get('/api/activities', async (_request, response) => {
    try {
      const activities = await getRecentActivities(50);
      response.json({ activities });
    } catch (error) {
      response.status(500).json({ error: error instanceof Error ? error.message : 'unknown' });
    }
  });

  app.get('/api/archive', async (_request, response) => {
    try {
      response.json(await buildArchive());
    } catch (error) {
      response.status(500).json({ error: error instanceof Error ? error.message : 'No se pudo exportar el archivo.' });
    }
  });

  app.put('/api/archive', async (request, response) => {
    try {
      const zodResult = ArchivePutSchema.safeParse(request.body || {});
      if (!zodResult.success) {
        response.status(400).json({ error: zodResult.error.errors.map((e) => e.message).join(', ') });
        return;
      }
      const meta = await applyArchive({
        ...request.body,
        force: request.query.force === '1',
      });
      void logActivity('archive_push', 'archive', null, null, { revision: meta.revision, force: request.query.force === '1' });
      response.json({ ok: true, updatedAt: meta.updatedAt, revision: meta.revision });
    } catch (error) {
      if (error?.code === 'REVISION_CONFLICT') {
        response.status(409).json({ error: 'Conflicto de revisión remota. Descarga el estado del servidor antes de sobrescribir.' });
        return;
      }
      response.status(500).json({ error: error instanceof Error ? error.message : 'No se pudo importar el archivo.' });
    }
  });

  app.post('/api/documents', upload.single('file'), async (request, response) => {
    const tempFilePath = request.file?.path;

    try {
      if (!request.file) {
        response.status(400).json({ error: 'Archivo requerido.' });
        return;
      }

      const payload = validateDocumentPayload(request.body);
      const state = await loadState();
      const record = {
        ...payload,
        name: request.file.originalname,
        mimeType: request.file.mimetype || 'application/octet-stream',
        size: request.file.size,
        uploadedAt: new Date().toISOString(),
        storage: 'remote',
        remotePath: `/api/documents/${payload.id}/download`,
      };

      await saveUploadedFile(request.file, record);
      state.documents = [record, ...state.documents.filter((item) => item.id !== record.id)];
      if (record.entityType === 'contract' && record.kind === 'anexo') {
        state.contracts = state.contracts.map((contract) =>
          contract.id === record.entityId
            ? { ...contract, annexCount: (contract.annexCount || 0) + 1 }
            : contract,
        );
      }
      if (state.asset) {
        state.asset.lastSyncedAt = new Date().toISOString();
        state.asset.syncStatus = 'online';
        state.asset.syncMessage = 'Documento sincronizado con backend.';
      }
      await saveState(state);
      const meta = await touchRevision();
      void logActivity('document_upload', payload.entityType, payload.id, null, { name: record.name, kind: payload.kind });
      response.json({
        record: {
          ...record,
          remotePath: `/api/documents/${payload.id}/download?rev=${meta.revision}`,
        },
        revision: meta.revision,
        updatedAt: meta.updatedAt,
      });
    } catch (error) {
      response.status(500).json({ error: error instanceof Error ? error.message : 'No se pudo subir el documento.' });
    } finally {
      await discardTempFile(tempFilePath);
    }
  });

  app.delete('/api/documents/:id', async (request, response) => {
    try {
      const state = await loadState();
      const record = state.documents.find((item) => item.id === request.params.id);
      if (!record) {
        response.status(404).json({ error: 'Documento no encontrado.' });
        return;
      }

      await fs.rm(getDocumentAbsolutePath(record), { force: true });
      state.documents = state.documents.filter((item) => item.id !== request.params.id);
      if (record.entityType === 'contract' && record.kind === 'anexo') {
        state.contracts = state.contracts.map((contract) =>
          contract.id === record.entityId
            ? { ...contract, annexCount: Math.max(0, (contract.annexCount || 0) - 1) }
            : contract,
        );
      }
      if (state.asset) {
        state.asset.lastSyncedAt = new Date().toISOString();
        state.asset.syncStatus = 'online';
        state.asset.syncMessage = 'Documento eliminado del backend.';
      }
      await saveState(state);
      const meta = await touchRevision();
      void logActivity('document_delete', record.entityType, request.params.id, null, { name: record.name, kind: record.kind });
      response.json({ ok: true, revision: meta.revision, updatedAt: meta.updatedAt });
    } catch (error) {
      response.status(500).json({ error: error instanceof Error ? error.message : 'No se pudo eliminar el documento.' });
    }
  });

  app.get('/api/documents/:id/download', async (request, response) => {
    try {
      const state = await loadState();
      const record = state.documents.find((item) => item.id === request.params.id);
      if (!record) {
        response.status(404).json({ error: 'Documento no encontrado.' });
        return;
      }

      const absolutePath = getDocumentAbsolutePath(record);
      await fs.access(absolutePath);
      response.download(absolutePath, record.name);
    } catch (error) {
      response.status(404).json({ error: error instanceof Error ? error.message : 'No se pudo descargar el documento.' });
    }
  });

  app.post('/api/connectors/pos/proxy', async (request, response) => {
    try {
      const zodResult = ProxyPayloadSchema.safeParse(request.body || {});
      if (!zodResult.success) {
        response.status(400).json({ error: zodResult.error.errors.map((e) => e.message).join(', ') });
        return;
      }
      const { endpoint, method, token, requestBody } = validateProxyPayload(request.body || {});

      if (!(await isAllowedEndpoint(endpoint))) {
        response.status(400).json({ error: 'Endpoint no permitido. Usa una URL pública HTTP/HTTPS.' });
        return;
      }

      const proxied = await fetch(endpoint, {
        method,
        headers: buildProxyHeaders(token, method === 'POST' ? requestBody : undefined),
        body: method === 'POST' ? requestBody : undefined,
        redirect: 'manual',
        signal: AbortSignal.timeout(POS_PROXY_TIMEOUT_MS),
      });

      const bodyBuffer = Buffer.from(await proxied.arrayBuffer());
      if (bodyBuffer.byteLength > MAX_PROXY_RESPONSE_BYTES) {
        response.status(502).json({ error: 'La respuesta del POS excede el tamaño permitido.' });
        return;
      }

      void logActivity('pos_proxy', 'connector', null, null, { endpoint, method, status: proxied.status });
      response.json({
        status: proxied.status,
        body: bodyBuffer.toString('utf8'),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        response.status(504).json({ error: 'El endpoint POS agotó el tiempo máximo de espera.' });
        return;
      }

      response.status(500).json({ error: error instanceof Error ? error.message : 'No se pudo conectar al POS remoto.' });
    }
  });

  app.post('/api/connectors/fiscal/ingest', upload.single('file'), async (request, response) => {
    const tempFilePath = request.file?.path;

    try {
      const rawText = normalizeText(request.body?.rawText, 5_000_000);
      if (rawText) {
        response.json({ text: rawText });
        return;
      }

      if (!request.file) {
        response.status(400).json({ error: 'Texto o archivo requerido.' });
        return;
      }

      const text = await extractUploadedText(request.file);
      if (!text) {
        response.status(422).json({ error: 'No se pudo extraer texto útil del archivo enviado.' });
        return;
      }

      void logActivity('fiscal_ingest', 'connector', null, null, { source: request.file ? request.file.originalname : 'rawText' });
      response.json({ text });
    } catch (error) {
      response.status(500).json({ error: error instanceof Error ? error.message : 'No se pudo procesar el archivo fiscal.' });
    } finally {
      await discardTempFile(tempFilePath);
    }
  });

  app.post('/api/contracts/autofill', autofillLimiter, upload.single('file'), async (request, response) => {
    const tempFilePath = request.file?.path;

    try {
      if (!request.file) {
        response.status(400).json({ error: 'Archivo PDF requerido.' });
        return;
      }

      const extension = path.extname(request.file.originalname || '').toLowerCase();
      if (request.file.mimetype !== 'application/pdf' && extension !== '.pdf') {
        response.status(400).json({ error: 'Solo se permiten archivos PDF.' });
        return;
      }

      const aiConfig = getContractAutofillAiConfig();
      if (!aiConfig) {
        await new Promise((resolve) => setTimeout(resolve, 450));
        void logActivity('contract_autofill', 'contract', null, null, { source: 'mock_local', filename: request.file.originalname });
        response.json(normalizeContractAutofillResult({}, '', 'mock_local'));
        return;
      }

      const textContent = await extractUploadedText(request.file);
      if (!textContent) {
        response.status(422).json({
          error: 'No se pudo extraer texto del PDF. Prueba con un PDF con texto seleccionable o usa el modo local sin API key.',
        });
        return;
      }

      const openai = new OpenAI({
        apiKey: aiConfig.apiKey,
        ...(aiConfig.baseURL ? { baseURL: aiConfig.baseURL } : {}),
      });

      const extractionMessages = buildRichExtractionMessages(textContent);

      const extractionResponse = await openai.chat.completions.create(
        buildContractAutofillCompletionRequest(aiConfig, extractionMessages),
      );

      const rawOutput = extractJsonObject(extractionResponse.choices?.[0]?.message?.content || '{}');
      let parsedInfo;
      try {
        parsedInfo = JSON.parse(rawOutput);
      } catch {
        console.error('JSON parse error en autofill. Raw output:', rawOutput.substring(0, 500));
        response.status(422).json({ error: 'La IA no devolvió un JSON válido. Intenta nuevamente o usa el modo local sin API key.' });
        return;
      }

      void logActivity('contract_autofill', 'contract', null, null, { source: aiConfig.provider, filename: request.file.originalname });
      const normalized = normalizeContractAutofillResult(parsedInfo, textContent, aiConfig.provider);
      const ufActual = Number(request.body?.ufActual) || undefined;
      const areaM2 = Number(request.body?.areaM2) || undefined;
      const enriched = applyPostDerivations(normalized, textContent, { ufActual, areaM2 });
      response.json(enriched);
    } catch (error) {
      console.error('Error autofilling contract:', error);
      response.status(500).json({ error: error instanceof Error ? error.message : 'Error extrayendo datos estructurales con Inteligencia Artificial' });
    } finally {
      await discardTempFile(tempFilePath);
    }
  });

  app.get('/api/units', async (req, res) => {
    try {
      const state = await loadState();
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
      const items = state.units;
      const total = items.length;
      const start = (page - 1) * limit;
      res.json({ items: items.slice(start, start + limit), page, limit, total });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'unknown' });
    }
  });

  app.get('/api/contracts', async (req, res) => {
    try {
      const state = await loadState();
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
      const items = state.contracts;
      const total = items.length;
      const start = (page - 1) * limit;
      res.json({ items: items.slice(start, start + limit), page, limit, total });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'unknown' });
    }
  });

  app.get('/api/sales', async (req, res) => {
    try {
      const state = await loadState();
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
      const items = state.sales;
      const total = items.length;
      const start = (page - 1) * limit;
      res.json({ items: items.slice(start, start + limit), page, limit, total });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'unknown' });
    }
  });

  return app;
}

export function createApp() {
  const app = createAppInstance();

  fs.access(path.join(DIST_DIR, 'index.html'))
    .then(() => {
      app.use(express.static(DIST_DIR));
      app.get('*', (_request, response) => {
        response.sendFile(path.join(DIST_DIR, 'index.html'));
      });
    })
    .catch(() => {
      // Frontend build may not exist in development or tests.
    });

  return app;
}

export async function startServer(port = PORT) {
  await ensureStorage();
  const app = createApp();
  return app.listen(port, () => {
    console.log(`MallIQ API escuchando en http://localhost:${port}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch((error) => {
    console.error('No se pudo iniciar MallIQ API:', error);
    process.exitCode = 1;
  });
}
