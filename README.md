# MallIQ — Operación y Analítica de Centros Comerciales

MallIQ es una SPA editorial para operación comercial, contractual y financiera de centros comerciales. Combina un sitio público de marketing, un cockpit administrativo y un portal de locatario, todo sobre React 19 + Express 5 + SQLite con autenticación JWT y autofill contractual con IA.

## Resumen

- **Sitio público** (`/`, `/producto`, `/operadores`, `/locatarios-info`, `/pricing`, `/manifiesto`, `/demo`) — landing editorial boutique en cream + ink + mint, tipografía *Instrument Serif*. Sin auth.
- **Cockpit administrativo** (`/admin/*`) — dashboard bento con KPIs, mapa de calor, semáforo de salud, comparador de portafolio, cola de renovaciones y simulador de renta.
- **Portal del locatario** (`/locatario/*`) — vista pinneada al contrato del usuario logueado.
- **Asistente IA** (`/admin/asistente`) — chat con contexto del portafolio y autofill de contratos desde PDF.
- Multi-activo con cambio de contexto en caliente; respaldo local + remoto; sincronización auto cada 15 s.
- UF cacheada por fecha contra mindicador.cl (`/api/uf/latest`, `/api/uf?date=...`, `/api/uf/range`).
- Tres roles: `admin`, `member`, `locatario`. JWT con bcrypt.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + TypeScript 5.9 + Vite 8 |
| Estilos | Tailwind 4 + CSS variables editoriales (cream/ink/mint/violet) |
| Tipografía | Inter (UI) · *Instrument Serif* (display) · JetBrains Mono (numbers) — autohospedadas vía `@fontsource` |
| Routing | `react-router-dom` con `HashRouter`, rutas públicas vs autenticadas separadas |
| Estado | React Context en `src/store/appState.tsx`; `useCurrency`/`useTheme` |
| Persistencia cliente | `localStorage` + `idb` |
| Backend | Express 5 + SQLite (`sqlite3` + `sqlite`) + JWT + bcrypt + helmet (CSP same-origin) |
| IA / OCR | SDK `openai`, Moonshot `kimi-k2.5`, `tesseract.js`, `pdf-parse v2` |
| Gráficos | `recharts` + SVG editorial nativo (`Spark`, `MallPlan`, `ContractTimeline`, `ForecastChart`) |
| Tests | Vitest + jsdom (150 tests · 13 archivos) |
| Despliegue prod | AWS EC2 + Docker Compose + Caddy auto-HTTPS · `do-up.cl` |

## Desarrollo local

```bash
npm install
npm run dev          # Vite dev server (frontend)
npm run dev:api      # Express con --watch (backend en :4000)
npm run dev:all      # ambos en paralelo
npm run build        # tsc -b && vite build → dist/
npm run lint
npm run test
npm start            # node server/index.js (sirve dist/)
```

## Variables de entorno

`.env.local` o `.env` se cargan automáticamente desde la raíz; `*.local` está ignorado por Git.

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del backend Express. Default `4000` |
| `API_KEY` | Bearer token opcional global para `/api/*` |
| `JWT_SECRET` | Secreto para firmar tokens de sesión. **Requerido** en producción |
| `MALLIQ_REQUIRE_AUTH` | Fuerza auth aunque no haya usuarios registrados (`'1'` para activar) |
| `MALLIQ_HTTP_LOG` | Loguea cada request HTTP (`'1'` para activar; default silencioso) |
| `VITE_API_BASE_URL` | Override del API base que usa el frontend (default `/api`) |
| `OPENAI_API_KEY` | Clave para autofill contractual con OpenAI |
| `OPENAI_BASE_URL` | Base URL OpenAI-compatible opcional |
| `MOONSHOT_API_KEY` | Clave Moonshot (preferida cuando está presente) |
| `MOONSHOT_BASE_URL` | Default `https://api.moonshot.ai/v1` |
| `CONTRACT_AUTOFILL_MODEL` | Default `kimi-k2.5` cuando hay Moonshot |
| `MALLIQ_DATA_DIR` | Override de carpeta de datos del backend |
| `MALLIQ_DB_PATH` | Override directo del archivo SQLite |

Configuración recomendada para Moonshot:

```env
MOONSHOT_API_KEY=tu_clave
MOONSHOT_BASE_URL=https://api.moonshot.ai/v1
CONTRACT_AUTOFILL_MODEL=kimi-k2.5
JWT_SECRET=cambiame-en-produccion
```

## Rutas

### Públicas (sin auth, sin providers)

| Ruta | Página |
|------|--------|
| `/` | Landing editorial · hero con plano del mall, módulos, quote, CTA |
| `/producto` | Deep-dive del producto · 6 módulos con visuales nativos |
| `/operadores` | Vertical para directores / CFOs · antes/después + jobs-to-be-done |
| `/locatarios-info` | Vertical para dueños de tienda · qué obtienen del portal |
| `/pricing` | 3 planes (Plaza / Centro · featured / Portafolio) + matriz comparativa + FAQ |
| `/manifiesto` | Manifiesto + equipo + inversionistas |
| `/demo` | Formulario de solicitud de demo |

### Cockpit administrativo (`admin` o `member`, JWT)

| Ruta | Página |
|------|--------|
| `/admin/dashboard` | Cockpit editorial · 5 KpiTile + comparador de activos + alerts feed + heatmap + expiry river + AI task |
| `/admin/activos` | Portafolio de activos · creación, métricas cruzadas |
| `/admin/locatarios` | Tabla con SemaforoStrip A→E + filtro/búsqueda |
| `/admin/locatarios/:id` | Ficha de locatario · HealthRing + 5 ComponentBars + sales chart + RentSteps |
| `/admin/rentas` | ContractTimeline (river coloreado por salud) + tabla + autofill |
| `/admin/cargas` | Carga de ventas (manual / OCR / fiscal / POS) |
| `/admin/planeacion` | Presupuesto + forecast con escenarios |
| `/admin/alertas` | 3 severity tiles (coral/amber/sky) + lista priorizada |
| `/admin/simulador` | Simulador "what-if" de renta — dos escenarios lado a lado |
| `/admin/ecosistema` | Prospectos + proveedores |
| `/admin/asistente` | Chat IA con contexto del portafolio + drop zone de autofill PDF |
| `/admin/configuracion` | Activo, sync, UF override, tema (light/dark/auto), usuarios, activity log |

### Portal del locatario (`locatario` con `tenant_contract_id`)

| Ruta | Página |
|------|--------|
| `/locatario/dashboard` | HealthRing + ComponentBars + KPIs personales |
| `/locatario/contrato` | Detalles del contrato del locatario |
| `/locatario/ventas` | Reporte de ventas |

### Login

`/login` muestra el `PortalSelector` (bypassea AuthGate si hay sesión válida).

## Sistema de diseño

- **Paleta**: cream + ink (charcoal cool/warm), mint (primario + salud-positiva), violet (IA/datos), amber (warning), coral (critical), sky (info).
- **Health ramp** A→E (`--health-a..e`) con umbrales 88/76/60/44.
- **Tipografía**: Inter para UI, *Instrument Serif* para titulares editoriales (`mq-h1/h2/h3`, `mq-display`), JetBrains Mono para números tabulares.
- **Utility classes** (en `src/index.css`):
  - `mq-card`, `mq-card.elevated/.outlined/.glass`
  - `mq-h1/-h2/-h3/-display/-italic/-eyebrow/-h-eyebrow`
  - `mq-num-xl/-l/-num/-s/-mono`
  - `mq-pill` + variantes `.mint/.violet/.amber/.coral/.sky`
  - `mq-bento` (12-col grid) + `span-3/4/5/6/7/8/9/12`
  - `[data-density="cozy|compact"]` para retunear paddings
- **Marketing** (`src/styles/marketing.css`): clases `mk-*` aisladas. La regla `.mk { … }` fuerza tokens cream y aísla del tema del cockpit.
- **Componentes compartidos** (`src/components/mallq/ui.tsx`):
  `TopBar, Pill, Spark, BarStack, KpiTile, MiniKpi, HealthBar, SemaforoStrip, ComponentBar, AiTask, InsightCard, Term, Stat, CategoryHeatmap, ExpiryRiver, ContractTimeline, ForecastChart, FootfallChart, CategoryDonut, MallPlan, RentSteps, ArrearsTimeline, Bento, HealthRing, Donut, Sparkline, AreaChart, TenantLogo, LifeChip, SigChip, Delta, Kpi`.

## Arquitectura funcional

### Estado multi-activo

- `PortfolioState` persistido en `localStorage` bajo `malliq-functional-state`.
- Cada workspace contiene `asset, units, contracts, sales, planning, documents, suppliers, prospects, posConnections, importLogs`.
- Backups de portafolio incluyen todos los workspaces y documentos.

### Sincronización remota

- Activos con `syncEnabled` + `backendUrl` sincronizan contra `/api/archive`.
- Auto-push tras 1.5 s de inactividad; auto-poll cada 15 s.
- Conflictos por mismatch de revisión devuelven 409; `forcePushToServer` los rompe.

### UF (Unidad de Fomento) por fecha

- Cache server-side en `uf_rates(date PK, value, fetched_at)`.
- Endpoints: `/api/uf/latest`, `/api/uf?date=YYYY-MM-DD`, `/api/uf/range?from&to`.
- Cliente cachea hasta 5 años en localStorage; `getUfFor(date)` resuelve sincrónicamente con fallback al rate previo más cercano.
- Conversión UF→CLP usa la UF de la **fecha del hecho**, no la actual.

### Anomalías + digest diario

- `src/lib/anomalies.ts` (cliente) y `server/anomalies.js` (servidor) implementan modified z-score + sudden-drop sobre ventas mensuales por contrato.
- `GET /api/notifications/daily` agrega anomalías + renovaciones ≤30 días + actividad de las últimas 24h.

### Documentos

- Local (IndexedDB) o remoto (`server/data/uploads`).
- Tipos: `contrato, anexo, carta_oferta, cip, foto, render, presupuesto, forecast, plano, permiso, otro`.

### Autofill contractual

- `POST /api/contracts/autofill` (PDF, requiere rol writer).
- Preferencia: Moonshot → OpenAI → mock local (con `source: 'mock_local'`).
- Backend normaliza fechas, montos, escalonados.

### Carga de ventas

- Manual, OCR (`tesseract.js`), texto/archivo fiscal, conector POS directo o vía proxy.

## Backend y robustez

- **Helmet** con CSP same-origin en producción (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; …`).
- **Rate limiters** scoped: `archiveWriteLimiter` (60 PUT/15min en `/api/archive`), `autofillLimiter` (10/min en autofill), `healthLimiter` (300/min en `/api/health`), `authLimiter` (login/register).
- **Body limits**: 1mb global, 50mb solo en `PUT /api/archive`.
- **Logger HTTP** gateado tras `MALLIQ_HTTP_LOG=1` (silencioso por default).
- **Proxy POS** con bloqueo SSRF (rechaza localhost / redes privadas), timeout, límite de respuesta.
- **App factory** (`createApp`) y arranque desacoplado (`startServer`) para tests de integración.

## Contratos y KPIs

Campos clave del contrato:

- `companyName, storeName, category, localIds, startDate, endDate`
- `fixedRent` (+ `fixedRentCurrency`: UF | CLP), `variableRentPct`, `baseRentUF` (informativo)
- `commonExpenses` (+ `commonExpensesCurrency`)
- `fondoPromocion` (+ `fondoPromocionCurrency`)
- `garantiaMonto` (+ `garantiaMontoCurrency`), `garantiaVencimiento`
- `feeIngreso` (+ `feeIngresoCurrency`)
- `rentSteps[]`
- 5 health checks: `healthPagoAlDia, healthEntregaVentas, healthNivelVenta, healthNivelRenta, healthPercepcionAdmin`

Cálculos vigentes:

- Renta fija mensual: `convertAmountToClpAt(fixedRent, fixedRentCurrency, refDate, getUfFor)`. **No** se multiplica por superficie.
- Renta variable: `ventas × variableRentPct / 100`.
- Renta total: fija + variable (CLP).
- Costo de ocupación %: `(renta total + GC + fondo) / ventas`.
- Salud: `healthScorePct` = checks marcados × 20 (0/20/40/60/80/100). Buckets A (≥88) / B (≥76) / C (≥60) / D (≥44) / E (resto).

## Roles y multi-tenant

- `admin`, `member`: cockpit completo en `/admin/*`.
- `locatario`: portal personal en `/locatario/*`, pinneado a `users.tenant_contract_id`.
- Si un locatario sin vinculación accede a `/locatario/*`, se muestra el empty state `LocatarioPendingBinding`.
- Rutas de escritura (`PUT /api/archive`, `POST/DELETE /api/documents`, `/api/connectors/*`, `/api/contracts/autofill[/ask]`) requieren `requireRole(['admin','member'])`.
- Provisión bulk de locatarios: `TenantUsersSection` en Configuración acepta CSV con `email,password,displayName,contractId`.

## Endpoints principales

| Método | Ruta | Uso |
|--------|------|-----|
| `GET` | `/api/health` | Estado, revisión, modo IA, summary, `authRequired/authBootstrapped` |
| `POST` | `/api/auth/register` | Registro (primer admin libre, después requiere admin existente) |
| `POST` | `/api/auth/login` | Login → `{token, user}` |
| `GET` | `/api/auth/me` | Usuario de la sesión |
| `GET` | `/api/auth/users` | Listar usuarios (admin) |
| `PATCH` | `/api/auth/users/:id/tenant` | Re-bind locatario↔contrato (admin) |
| `GET` | `/api/uf/latest` | UF actual desde mindicador.cl |
| `GET` | `/api/uf?date=YYYY-MM-DD` | UF de una fecha (con fallback a previo) |
| `GET` | `/api/uf/range?from&to` | UF en rango |
| `GET` | `/api/notifications/daily` | Digest 24h: anomalías + renovaciones + actividad |
| `GET` | `/api/activities` | Activity log (admin) |
| `GET` | `/api/archive` | Exporta estado completo |
| `PUT` | `/api/archive` | Importa estado con control de revisión (writer) |
| `POST` | `/api/documents` | Sube documento remoto (writer) |
| `DELETE` | `/api/documents/:id` | Elimina documento (writer) |
| `GET` | `/api/documents/:id/download` | Descarga documento |
| `POST` | `/api/connectors/pos/proxy` | Proxy POS seguro (writer) |
| `POST` | `/api/connectors/fiscal/ingest` | Extrae texto desde texto/archivo/PDF/imagen (writer) |
| `POST` | `/api/contracts/autofill` | Extrae datos contractuales desde PDF (writer) |
| `POST` | `/api/contracts/autofill/ask` | Variante conversacional del autofill (writer) |

## Estructura

```text
src/
  components/
    layout/{AppLayout,Sidebar,Navbar}.tsx
    marketing/Shell.tsx
    mallq/{ui.tsx,helpers.ts}
    app/{TenantUsersSection,UfOverrideModal,ActivityLogSection,...}.tsx
    {AuthGate,RoleGuards,Toast,ConfirmDialog,...}.tsx
  pages/
    PortalSelector.tsx
    NotFound.tsx
    marketing/{Landing,Producto,Operadores,Locatarios,Pricing,Manifiesto,Demo}.tsx
    admin/{Dashboard,Portafolio,Locatarios,LocatarioDetail,RentasContratos,
           CargasDatos,Planeacion,Ecosistema,Alertas,Configuracion,
           Simulador,Asistente}.tsx
    locatario/{Dashboard,Contrato,Ventas,PendingBinding}.tsx
  lib/{domain,portfolio,api,currency,theme,anomalies,...}.ts
  store/appState.tsx
  styles/marketing.css
  index.css
server/
  index.js auth.js db.js uf.js anomalies.js env.js
  *.test.ts
infra/aws/                # llaves de despliegue (gitignored)
deploy.ps1
docker-compose.prod.yml
README.md AGENTS.md
```

## Tests

```bash
npm run lint
npm run test
npm run test:watch
npm run build
```

Cobertura actual:

- Dominio (`src/lib/domain.test.ts`, `src/lib/anomalies.test.ts`)
- Componentes UI (`src/components/mallq/ui.test.tsx`, `src/components/layout/Navbar.test.tsx`)
- Guards (`src/components/RoleGuards.test.tsx`)
- Dashboard (`src/pages/admin/Dashboard.test.tsx`)
- Backend integración (`server/server.integration.test.ts`, `server/auth.integration.test.ts`, `server/uf.test.ts`)

## Despliegue

### Self-hosted simple

```bash
npm run build
npm start                    # Express sirve dist/ + /api/*
```

### Producción actual (`do-up.cl`)

EC2 + Docker Compose + Caddy con HTTPS automático.

```bash
ssh -i infra/aws/malliq-key.pem ec2-user@54.233.206.7
cd /opt/malliq
git pull --ff-only
docker compose -f docker-compose.prod.yml up -d --build
```

## Convenciones

- UI y copy en español; nomenclatura de dominio también en español (`Locatarios`, `Contratos`, `Ventas`).
- El término funcional vigente es **Activo**, no "Mall".
- Usar `useCurrency()` para todo lo monetario (no `formatPeso` en código nuevo).
- Display editorial usa la familia `var(--font-display)` (Instrument Serif). Números tabulares usan `var(--font-mono)` (JetBrains Mono).
- Mint = primario, violet = IA/datos, amber = warning, coral = critical, sky = info.
- Marketing y cockpit son árboles de proveedores **separados** (ver `src/App.tsx`). Las páginas `mk-*` no comparten estado con el cockpit.
