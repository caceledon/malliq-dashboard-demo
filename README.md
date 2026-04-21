# MallIQ — Operación y Analítica de Centros Comerciales

MallIQ es una SPA para operación comercial, contractual y financiera de activos comerciales. Combina frontend React 19, backend Express 5 con SQLite, almacenamiento documental híbrido y autofill contractual con IA.

## Resumen

- Operación multi-activo con cambio de contexto en caliente.
- Dashboard con KPIs de ocupación, ventas, rentas, firmas, alertas y comparativo de portafolio.
- Gestión de contratos con garantías, fee de ingreso, fondo de promoción, escalonados de renta y salud del locatario.
- Carga de ventas por captura manual, OCR, impresora fiscal y conectores POS.
- Respaldo local y remoto, documentos híbridos y sincronización multiusuario con control de revisión.
- Autofill de contratos desde PDF usando Moonshot/OpenAI o fallback mock local.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + TypeScript 5.9 + Vite 8 |
| Estilos | Tailwind CSS 4 |
| Routing | `react-router-dom` con `HashRouter` |
| Estado | React Context personalizado en `src/store/appState.tsx` |
| Persistencia cliente | `localStorage` + `idb` |
| Backend | Express 5 + SQLite (`sqlite3` + `sqlite`) |
| IA / OCR | SDK `openai`, Moonshot, OpenAI, `tesseract.js`, `pdf-parse` v2 |
| Gráficos | `recharts` |
| Tests | Vitest + jsdom |

## Desarrollo local

```bash
npm install
npm run dev
npm run dev:api
npm run dev:all
npm run build
npm run lint
npm run test
npm start
```

## Variables de entorno

El backend carga automáticamente `.env.local` y `.env` desde la raíz del proyecto. `.env.local` ya está ignorado por Git mediante `*.local`.

Variables disponibles:

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del backend Express. Default: `4000` |
| `API_KEY` | Bearer token opcional para proteger `/api/*` |
| `VITE_API_BASE_URL` | Base URL del API usada por el frontend |
| `OPENAI_API_KEY` | Clave para autofill contractual con OpenAI |
| `OPENAI_BASE_URL` | Base URL OpenAI-compatible opcional |
| `MOONSHOT_API_KEY` | Clave para Moonshot |
| `MOONSHOT_BASE_URL` | Base URL Moonshot. Default actual: `https://api.moonshot.ai/v1` |
| `CONTRACT_AUTOFILL_MODEL` | Modelo de autofill. Recomendado actual: `kimi-k2.5` |
| `MALLIQ_DATA_DIR` | Override de carpeta de datos del backend |
| `MALLIQ_DB_PATH` | Override directo de la ruta del archivo SQLite |

Configuracion recomendada para Moonshot:

```env
MOONSHOT_API_KEY=tu_clave
MOONSHOT_BASE_URL=https://api.moonshot.ai/v1
CONTRACT_AUTOFILL_MODEL=kimi-k2.5
```

## Arquitectura funcional

### Estado multi-activo

- El estado persistido del frontend usa `PortfolioState` bajo la clave `malliq-functional-state`.
- Cada workspace contiene `asset`, `units`, `contracts`, `sales`, `planning`, `documents`, `suppliers`, `prospects`, `posConnections` e `importLogs`.
- Los respaldos de portafolio incluyen todos los workspaces y documentos.

### Sincronización remota

- Si un activo tiene `syncEnabled` y `backendUrl`, el frontend sincroniza contra `/api/archive`.
- Los cambios locales se publican tras 1.5 s de inactividad.
- El frontend consulta salud remota cada 15 s vía `/api/health`.
- Si la revisión remota avanza mientras hay cambios locales pendientes, el activo entra en estado `conflict`.
- Si no hay cambios locales pendientes y aparece una revisión remota más nueva, el frontend descarga el estado remoto automáticamente.

### Documentos

- Los documentos pueden almacenarse localmente en IndexedDB o remotamente en el backend.
- Los documentos remotos viven en `server/data/uploads` o en `MALLIQ_DATA_DIR/uploads`.
- Tipos soportados: `contrato`, `anexo`, `carta_oferta`, `cip`, `foto`, `render`, `presupuesto`, `forecast`, `plano`, `permiso`, `otro`.

### Autofill contractual con IA

- Endpoint: `POST /api/contracts/autofill`.
- Entrada: PDF.
- Flujo:
  - Si hay `MOONSHOT_API_KEY`, se usa Moonshot.
  - Si no hay Moonshot pero sí `OPENAI_API_KEY`, se usa OpenAI.
  - Si no hay credenciales, se devuelve una plantilla mock normalizada.
- El backend normaliza montos, fechas, escalonados y metadata del origen (`source`, `mocked`).
- La UI muestra si el resultado provino de Moonshot, OpenAI o fallback local.

### Carga de ventas

- Manual.
- OCR local con `tesseract.js`.
- Texto/archivo fiscal por backend.
- Conector POS directo o vía proxy de servidor.
- El backend de ingestión fiscal acepta texto, archivos de texto, PDF e imágenes. Para imágenes usa OCR.

## Backend y robustez

El backend actual incorpora varias garantías que ya forman parte del producto:

- Validación de payloads de documentos, proxy POS y backups.
- Límite de tamaño de uploads.
- Proxy POS con protección SSRF, bloqueo de redes privadas, timeout y límite de respuesta.
- `/api/health` devuelve `revision`, `archiveExists`, `aiMode` y resumen de entidades remotas.
- SQLite inicializable en rutas custom para pruebas y despliegues.
- Soporte de app factory (`createApp`) y arranque desacoplado (`startServer`) para pruebas de integración.

## Contratos y KPIs

Campos relevantes del contrato:

- `companyName`, `storeName`, `category`
- `localIds`
- `startDate`, `endDate`
- `fixedRent`, `variableRentPct`, `baseRentUF`
- `commonExpenses`, `fondoPromocion`
- `garantiaMonto`, `garantiaVencimiento`
- `feeIngreso`
- `rentSteps`
- `healthPagoAlDia`, `healthEntregaVentas`, `healthNivelVenta`, `healthNivelRenta`, `healthPercepcionAdmin`

Reglas y cálculos vigentes:

- Renta fija total: `m2 * UF/m2 * valor UF` cuando aplica `baseRentUF`.
- Renta variable total: `ventas * variableRentPct`.
- Renta total: fija + variable.
- Costo de ocupación: `(renta total + gastos comunes + fondo promocion) / ventas`.
- El editor de contratos valida rangos de fechas, montos negativos, porcentaje variable > 100%, escalonados fuera de rango y step-ups superpuestos.

## Calidad y pruebas

Comandos:

```bash
npm run lint
npm run test
npm run test:watch
npm run build
```

Cobertura actual:

- Dominio contractual y financiero en `src/lib/domain.test.ts`
- Alertas, conflictos de cobertura y snapshots comerciales
- Integracion backend en `server/server.integration.test.ts`
  - `/api/health`
  - `/api/archive`
  - documentos remotos
  - proxy POS
  - ingestión fiscal
  - autofill mock contractual

## Endpoints principales

| Metodo | Ruta | Uso |
|--------|------|-----|
| `GET` | `/api/health` | Estado remoto, revision, modo IA y resumen |
| `GET` | `/api/archive` | Exporta estado completo y documentos |
| `PUT` | `/api/archive` | Importa estado completo con control de revision |
| `POST` | `/api/documents` | Sube documento remoto |
| `DELETE` | `/api/documents/:id` | Elimina documento remoto |
| `GET` | `/api/documents/:id/download` | Descarga documento |
| `POST` | `/api/connectors/pos/proxy` | Proxy seguro para POS |
| `POST` | `/api/connectors/fiscal/ingest` | Extrae texto desde texto, archivo, PDF o imagen |
| `POST` | `/api/contracts/autofill` | Extrae datos contractuales desde PDF |

## Estructura principal

```text
src/
  components/
  lib/
  pages/
  store/appState.tsx
server/
  env.js
  db.js
  index.js
  server.integration.test.ts
README.md
AGENTS.md
vitest.config.ts
```

## Convenciones

- UI y copy en español.
- Dominio y nombres de negocio en español.
- El término funcional vigente es `Activo`, no `Mall`.
- La visualización monetaria nueva debe usar `useCurrency()` y no `formatPeso`.

## Despliegue

Para despliegue simple:

```bash
npm run build
npm start
```

El backend sirve `dist/` si existe y hace fallback al `index.html` para la SPA.
