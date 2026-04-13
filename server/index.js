import cors from 'cors';
import express from 'express';
import fs from 'node:fs/promises';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import OpenAI from 'openai';
import { fetchFullState, replaceFullState, getMeta, incrementRevision } from './db.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PORT = Number(process.env.PORT || 4000);

const upload = multer({ dest: path.join(DATA_DIR, 'tmp') });

function emptyState() {
  return {
    mall: null,
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

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function ensureStorage() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

async function loadState() {
  return await fetchFullState();
}

async function saveState(state) {
  await replaceFullState(state);
}

async function loadMeta() {
  return await getMeta();
}

async function touchRevision() {
  return await incrementRevision();
}

function getDocumentAbsolutePath(record) {
  if (record.remotePath) {
    const filename = record.remotePath.split('/').pop();
    return path.join(UPLOADS_DIR, filename);
  }
  return path.join(UPLOADS_DIR, `${record.id}-${sanitizeFilename(record.name)}`);
}

async function blobFileToDataUrl(filePath, mimeType) {
  const buffer = await fs.readFile(filePath);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function dataUrlToBuffer(dataUrl) {
  const [, base64 = ''] = dataUrl.split(',');
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
    serverRevision: meta.revision,
  };
}

async function clearUploads() {
  await ensureStorage();
  const files = await fs.readdir(UPLOADS_DIR).catch(() => []);
  await Promise.all(files.map((file) => fs.rm(path.join(UPLOADS_DIR, file), { force: true })));
}

async function applyArchive(archive) {
  const normalizedState = archive?.state ?? emptyState();
  const meta = await loadMeta();
  const expectedRevision = archive?.serverRevision;
  const force = archive?.force === true;
  if (!force && Number.isFinite(expectedRevision) && Number(expectedRevision) !== Number(meta.revision)) {
    const conflict = new Error('Revision conflict');
    conflict.code = 'REVISION_CONFLICT';
    throw conflict;
  }
  await clearUploads();

  if (Array.isArray(archive?.documents)) {
    for (const item of archive.documents) {
      if (!item?.record || !item.dataUrl) {
        continue;
      }

      const filename = `${item.record.id}-${sanitizeFilename(item.record.name)}`;
      await fs.writeFile(path.join(UPLOADS_DIR, filename), dataUrlToBuffer(item.dataUrl));
    }
  }

  normalizedState.documents = (normalizedState.documents || []).map((record) => ({
    ...record,
    storage: 'remote',
    remotePath: `/api/documents/${record.id}/download`,
  }));
  if (normalizedState.mall) {
    normalizedState.mall.lastSyncedAt = new Date().toISOString();
  }
  await saveState(normalizedState);
  return touchRevision();
}

async function saveUploadedFile(file, record) {
  await ensureStorage();
  const targetName = `${record.id}-${sanitizeFilename(record.name)}`;
  const targetPath = path.join(UPLOADS_DIR, targetName);
  await fs.copyFile(file.path, targetPath);
  await fs.rm(file.path, { force: true });
  return targetName;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuración de Auth (Template para producción)
const PROD_API_KEY = process.env.API_KEY || null;

app.use('/api', (req, res, next) => {
  if (!PROD_API_KEY) {
    return next(); // Bypass en desarrollo o si no hay key
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
      archiveExists: state.documents.length > 0 || state.contracts.length > 0 || state.units.length > 0,
      updatedAt: meta.updatedAt ?? state.mall?.lastSyncedAt ?? null,
      revision: Number(meta.revision || 0),
    });
  } catch (error) {
    response.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'unknown' });
  }
});

app.get('/api/archive', async (_request, response) => {
  try {
    response.json(await buildArchive());
  } catch (error) {
    response.status(500).send(error instanceof Error ? error.message : 'No se pudo exportar el archivo.');
  }
});

app.put('/api/archive', async (request, response) => {
  try {
    const meta = await applyArchive({
      ...request.body,
      force: request.query.force === '1',
    });
    response.json({ ok: true, updatedAt: meta.updatedAt, revision: meta.revision });
  } catch (error) {
    if (error?.code === 'REVISION_CONFLICT') {
      response.status(409).send('Conflicto de revisión remota. Descarga el estado del servidor antes de sobrescribir.');
      return;
    }
    response.status(500).send(error instanceof Error ? error.message : 'No se pudo importar el archivo.');
  }
});

app.post('/api/documents', upload.single('file'), async (request, response) => {
  try {
    if (!request.file) {
      response.status(400).send('Archivo requerido.');
      return;
    }

    const state = await loadState();
    const record = {
      id: String(request.body.id),
      entityType: String(request.body.entityType),
      entityId: String(request.body.entityId),
      name: request.file.originalname,
      kind: String(request.body.kind),
      mimeType: request.file.mimetype || 'application/octet-stream',
      size: request.file.size,
      note: request.body.note || undefined,
      uploadedAt: new Date().toISOString(),
      storage: 'remote',
      remotePath: `/api/documents/${String(request.body.id)}/download`,
    };

    await saveUploadedFile(request.file, record);
    state.documents = [record, ...(state.documents || []).filter((item) => item.id !== record.id)];
    if (record.entityType === 'contract' && record.kind === 'anexo') {
      state.contracts = (state.contracts || []).map((contract) =>
        contract.id === record.entityId
          ? { ...contract, annexCount: (contract.annexCount || 0) + 1 }
          : contract,
      );
    }
    if (state.mall) {
      state.mall.lastSyncedAt = new Date().toISOString();
    }
    await saveState(state);
    const meta = await touchRevision();
    response.json({
      record: {
        ...record,
        remotePath: `/api/documents/${String(request.body.id)}/download?rev=${meta.revision}`,
      },
      revision: meta.revision,
      updatedAt: meta.updatedAt,
    });
  } catch (error) {
    response.status(500).send(error instanceof Error ? error.message : 'No se pudo subir el documento.');
  }
});

app.delete('/api/documents/:id', async (request, response) => {
  try {
    const state = await loadState();
    const record = (state.documents || []).find((item) => item.id === request.params.id);
    if (!record) {
      response.status(404).send('Documento no encontrado.');
      return;
    }

    await fs.rm(getDocumentAbsolutePath(record), { force: true });
    state.documents = (state.documents || []).filter((item) => item.id !== request.params.id);
    if (record.entityType === 'contract' && record.kind === 'anexo') {
      state.contracts = (state.contracts || []).map((contract) =>
        contract.id === record.entityId
          ? { ...contract, annexCount: Math.max(0, (contract.annexCount || 0) - 1) }
          : contract,
      );
    }
    if (state.mall) {
      state.mall.lastSyncedAt = new Date().toISOString();
    }
    await saveState(state);
    const meta = await touchRevision();
    response.json({ ok: true, revision: meta.revision, updatedAt: meta.updatedAt });
  } catch (error) {
    response.status(500).send(error instanceof Error ? error.message : 'No se pudo eliminar el documento.');
  }
});

app.get('/api/documents/:id/download', async (request, response) => {
  try {
    const state = await loadState();
    const record = (state.documents || []).find((item) => item.id === request.params.id);
    if (!record) {
      response.status(404).send('Documento no encontrado.');
      return;
    }

    response.download(getDocumentAbsolutePath(record), record.name);
  } catch (error) {
    response.status(500).send(error instanceof Error ? error.message : 'No se pudo descargar el documento.');
  }
});

app.post('/api/connectors/pos/proxy', async (request, response) => {
  try {
    const { endpoint, method = 'GET', token, requestBody } = request.body || {};
    if (!endpoint) {
      response.status(400).send('Endpoint requerido.');
      return;
    }

    const proxied = await fetch(endpoint, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(requestBody ? { 'Content-Type': 'application/json' } : {}),
      },
      body: method === 'POST' && requestBody ? requestBody : undefined,
    });

    response.json({
      status: proxied.status,
      body: await proxied.text(),
    });
  } catch (error) {
    response.status(500).send(error instanceof Error ? error.message : 'No se pudo conectar al POS remoto.');
  }
});

app.post('/api/connectors/fiscal/ingest', upload.single('file'), async (request, response) => {
  try {
    const rawText = request.body?.rawText;
    if (rawText) {
      response.json({ text: rawText });
      return;
    }

    if (!request.file) {
      response.status(400).send('Texto o archivo requerido.');
      return;
    }

    const text = await fs.readFile(request.file.path, 'utf8');
    await fs.rm(request.file.path, { force: true });
    response.json({ text });
  } catch (error) {
    response.status(500).send(error instanceof Error ? error.message : 'No se pudo procesar el archivo fiscal.');
  }
});

app.post('/api/contracts/autofill', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo PDF requerido.' });
    }
    
    // Leer texto del PDF
    const buffer = await fs.readFile(req.file.path);
    const pdfData = await pdfParse(buffer);
    const textContent = pdfData.text;

    // Limpiar tmp file
    await fs.rm(req.file.path, { force: true });

    const apiKey = process.env.MOONSHOT_API_KEY;

    // Si NO hay API_KEY de Moonshot, generamos un Mock Object Dummy para testear local
    if (!apiKey) {
      // Delay it to feel like AI processing smoothly
      await new Promise(r => setTimeout(r, 2200)); 
      
      return res.json({
        companyName: 'Dummy Corporación Local-First SpA (Autofill)',
        storeName: 'Tienda de Inteligencia (Generado)',
        category: 'Fashion & Tech',
        baseRentUF: 15.5,
        commonExpenses: 0.10,
        fixedRent: 2000000,
        variableRentPct: 4.5,
        escalation: 'IPC Semestral',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 31536000000 * 3).toISOString().split('T')[0]
      });
    }

    // Integración Real API Kimi 2.5 / Moonshot
    const openai = new OpenAI({ 
      apiKey: apiKey,
      baseURL: 'https://api.moonshot.cn/v1'
    });
    
    const extractionResponse = await openai.chat.completions.create({
      model: 'moonshot-v1-8k',
      messages: [
        {
          role: 'system',
          content: 'Eres un agente inmobiliario extractivo. Tu labor es extrar datos del contrato proporcionado estrictamente en formato JSON válido devolviendo las llaves. IMPORTANTE: Devuelve ÚNICAMENTE el código JSON, sin formato markdown ni caracteres adicionales. Si un dato no existe, devuélvelo null, pero no rompas la estructura.'
        },
        {
          role: 'user',
          content: `Extrae información del siguiente contrato rellenando este JSON exacto: 
{ "companyName": "string", "storeName": "string", "category": "string", "baseRentUF": number val, "fixedRent": number val, "variableRentPct": number val float like 4.5, "commonExpenses": number like 0.1 for 10%, "escalation": "string", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }

Texto extraído: 
${textContent.substring(0, 48000)}` 
        }
      ]
    });

    let rawOutput = extractionResponse.choices[0].message.content || '{}';
    // Limpieza robusta de Markdown si el LLM inyectó codetags
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawOutput = jsonMatch[0];
    }
    
    const parsedInfo = JSON.parse(rawOutput);
    res.json(parsedInfo);

  } catch (error) {
    console.error('Error autofilling contract:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error extrayendo datos estructurales con Inteligencia Artificial' });
  }
});

try {
  await fs.access(path.join(DIST_DIR, 'index.html'));
  app.use(express.static(DIST_DIR));
  app.get('*', (_request, response) => {
    response.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} catch {
  // Frontend build may not exist in development.
}

app.listen(PORT, async () => {
  await ensureStorage();
  console.log(`MallIQ API escuchando en http://localhost:${PORT}`);
});
