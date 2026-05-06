# MallIQ — Operación y Analítica de Centros Comerciales

MallIQ es una SPA editorial para operación comercial, contractual y financiera de centros comerciales. Combina un sitio público de marketing, un cockpit administrativo y un portal de locatario, todo sobre React 19 + Express 5 + SQLite con autenticación JWT y autofill contractual con IA.

> **Mercado**: producto chileno para el mercado chileno. Locale primario `es-CL`, moneda CLP/UF, timezone `America/Santiago`. No hay presencia en México, Colombia ni otros mercados.

## Resumen

- **Sitio público** (`/`, `/producto`, `/operadores`, `/locatarios-info`, `/pricing`, `/manifiesto`, `/demo`) — landing editorial boutique en cream + ink + accent (Claude coral), tipografía *Instrument Serif*. Sin auth.
- **Cockpit administrativo** (`/admin/*`) — dashboard bento con KPIs, plano dinámico del activo (`InteractiveMap`), mapa de calor, semáforo de salud, comparador de portafolio, cola de renovaciones y simulador de renta.
- **Detalle de activo** (`/admin/activos/:id`) — vista per-activo con plano + KPIs + listado de locatarios, accesible al hacer click en una fila del portafolio.
- **Portal del locatario** (`/locatario/*`) — vista pinneada al contrato del usuario logueado.
- **Asistente IA** (`/admin/asistente`) — chat con contexto del portafolio y autofill de contratos desde PDF.
- Multi-activo con cambio de contexto en caliente; respaldo local + remoto; sincronización auto cada 15 s.
- UF cacheada por fecha contra mindicador.cl (`/api/uf/latest`, `/api/uf?date=...`, `/api/uf/range`).
- Tres roles: `admin`, `member`, `locatario`. JWT con bcrypt.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + TypeScript 5.9 + Vite 8 |
| Estilos | Tailwind 4 + CSS variables editoriales (cream/ink/accent/mint/violet) |
| Tipografía | Inter (UI) · *Instrument Serif* (display) · JetBrains Mono (numbers) — autohospedadas vía `@fontsource` |
| Routing | `react-router-dom` con `HashRouter`, rutas públicas vs autenticadas separadas; marketing tree lazy-loaded |
| Estado | React Context en `src/store/appState.tsx`; `useCurrency`/`useTheme`/`useReducedMotion` |
| Persistencia cliente | `localStorage` + `idb` |
| Backend | Express 5 + SQLite (`sqlite3` + `sqlite`) + JWT + bcrypt + helmet (CSP same-origin) + `undici` (DNS-pinned dispatcher para SSRF guard) |
| IA / OCR | SDK `openai`, Moonshot `kimi-k2.5`, `tesseract.js`, `pdf-parse v2` |
| Gráficos | `recharts` + SVG editorial nativo (`Spark`, `MallPlan`, `InteractiveMap`, `ContractTimeline`, `ForecastChart`) |
| Tests | Vitest + jsdom (248 tests · 32 archivos) |
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
| `MALLIQ_JWT_SECRET` | Secreto para firmar tokens de sesión. **Requerido** en producción |
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
| `VAPID_PUBLIC_KEY` | Track 7 — clave VAPID pública. Sin ella el push subscribe responde `unconfigured`. |
| `VAPID_PRIVATE_KEY` | Track 7 / 10 — necesaria para conectar el adaptador de envío real (web-push). |
| `MALLIQ_SMTP_URL` | Track 10 — transport email cuando se cablee el adaptador SMTP. |

Configuración recomendada para Moonshot:

```env
MOONSHOT_API_KEY=tu_clave
MOONSHOT_BASE_URL=https://api.moonshot.ai/v1
CONTRACT_AUTOFILL_MODEL=kimi-k2.5
MALLIQ_JWT_SECRET=cambiame-en-produccion
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
| `/admin/dashboard` | Cockpit editorial · 5 KpiTile + comparador de activos + alerts feed + heatmap + expiry river + AI task + plano dinámico del activo (`InteractiveMap`) |
| `/admin/activos` | Portafolio de activos · creación, métricas cruzadas, filas clicables |
| `/admin/activos/:id` | Detalle per-activo · KPIs + plano + listado de locatarios del activo |
| `/admin/locatarios` | Tabla con SemaforoStrip A→E + filtro/búsqueda |
| `/admin/locatarios/:id` | Ficha de locatario · HealthRing + 5 ComponentBars + sales chart + RentSteps |
| `/admin/rentas` | ContractTimeline (river coloreado por salud) + tabla + autofill con scroll preservado en `ContractEditor` |
| `/admin/cargas` | Carga de ventas (manual / OCR / fiscal / POS) |
| `/admin/planeacion` | Presupuesto + forecast P10/P50/P90 con escenarios |
| `/admin/alertas` | 3 severity tiles (coral/amber/sky) + lista priorizada |
| `/admin/simulador` | Simulador "what-if" de renta — dos escenarios lado a lado |
| `/admin/ecosistema` | Prospectos + proveedores |
| `/admin/asistente` | Chat IA · tool-calling Moonshot sobre el portafolio (Track 2, flag `asistenteIA`) + drop zone de autofill PDF |
| `/admin/configuracion` | Activo, sync, UF override, tema (light/dark/auto), usuarios, activity log, **Etiquetas experimentales** (feature flags por track) |
| `/admin/design-lab` | Surface interno: muestra cada primitivo del sistema de diseño contra los tokens vigentes + reporte de contraste WCAG AA |
| `/admin/clausulas` | Ledger de cláusulas extraídas (Track 3, flag `clausulasLedger`). Re-extracción del PDF fuente del contrato con clasificación por tipo. |
| `/admin/cam` | Reconciliación de gastos comunes (Track 8, flag `camReconciliation`). Distribución por GLA o plana entre contratos vigentes. |
| `/admin/licencias-corto-plazo` | Casual licensing (Track 6, flag `casualLicensing`). Kioscos / ATMs / pop-ups / eventos. |
| `/admin/broadcast` | Crisis broadcast multi-canal (Track 10, flag `crisisBroadcast`). Admin-only. Evacuación requiere two-person confirm. |

### Portal del locatario (`locatario` con `tenant_contract_id`)

| Ruta | Página |
|------|--------|
| `/locatario/dashboard` | HealthRing + ComponentBars + KPIs personales |
| `/locatario/contrato` | Detalles del contrato del locatario |
| `/locatario/ventas` | Reporte de ventas |

### Login

`/login` muestra el `PortalSelector` (bypassea AuthGate si hay sesión válida).

## Sistema de diseño

- **Paleta**: cream + ink (charcoal warm), `--accent` (Claude coral, primary CTAs), mint (salud-positiva), violet (IA/datos), amber (warning), coral (critical), sky (info).
- **Health ramp** A→E (`--health-a..e`) con umbrales 88/76/60/44.
- **Tipografía**: Inter para UI, *Instrument Serif* para titulares editoriales (`mq-h1/h2/h3`, `mq-display`), JetBrains Mono para números tabulares.
- **Motion tokens**: `--ease-emphasized`, `--ease-standard`, `--ease-out` — fuente única de las curvas. `prefers-reduced-motion` colapsa la duración de las animaciones de entrada y los componentes que renderizan SVG SMIL (`<animate>`) consultan `useReducedMotion()` para omitirlos.
- **Glassmorphism**: piso de opacidad 88% en todas las superficies con `backdrop-filter` (sidebar, topbar, `.glass-card`, `.mq-card.glass`) — preserva contraste WCAG AA del texto contra el surface en light + dark.
- **Utility classes** (en `src/index.css`):
  - `mq-card`, `mq-card.elevated/.outlined/.glass`
  - `mq-h1/-h2/-h3/-display/-italic/-eyebrow/-h-eyebrow`
  - `mq-num-xl/-l/-num/-s/-mono`
  - `mq-pill` + variantes `.mint/.violet/.amber/.coral/.sky`
  - `mq-btn` + variantes `.primary/.accent/.mint/.violet/.umber/.ghost` (`accent` aplica `--accent` para énfasis primario)
  - `mq-bento` (12-col grid) + `span-3/4/5/6/7/8/9/12`
  - `[data-density="cozy|compact"]` para retunear paddings
- **Marketing** (`src/styles/marketing.css`): clases `mk-*` aisladas. La regla `.mk { … }` fuerza tokens cream y aísla del tema del cockpit. `mk-btn.primary:hover` y `mk-btn.ghost:hover` aterrizan en `--accent`; `mk-btn.accent` aplica accent puro.
- **Componentes compartidos** (`src/components/mallq/ui.tsx`):
  `TopBar, Pill, Spark, BarStack, KpiTile, MiniKpi, HealthBar, SemaforoStrip, ComponentBar, AiTask, InsightCard, Term, Stat, CategoryHeatmap, ExpiryRiver, ContractTimeline, ForecastChart, FootfallChart, CategoryDonut, MallPlan, RentSteps, ArrearsTimeline, Bento, HealthRing, Donut, Sparkline, AreaChart, TenantLogo, LifeChip, SigChip, Delta, Kpi`. El plano dinámico per-activo es `InteractiveMap` en `src/components/InteractiveMap.tsx` (consume `useAppState` directamente).

## Arquitectura funcional

### Estado multi-activo

- `PortfolioState` (versión `3`) persistido en `localStorage` bajo `malliq-functional-state`.
- Cada workspace contiene `asset, units, contracts, sales, planning, documents, suppliers, prospects, posConnections, importLogs, casualLicenses?, camReconciliations?, broadcasts?`.
- `featureFlags?: Partial<Record<FeatureFlagKey, boolean>>` — slot de etiquetas experimentales por track. La migración v2 → v3 es automática y opt-in (default: `sourceLinkedAbstracts: true`, resto off).
- Backups de portafolio incluyen todos los workspaces y documentos.

### Feature flags y tracks

12 tracks construidos sobre el playbook competitivo (Yardi / Prophia / Solutions Malls / Placer.ai). Cada uno detrás de un flag en `Configuración → Etiquetas experimentales`:

| Track | Flag | Estado v1 |
|-------|------|-----------|
| 1 — Source-linked contract abstracts | `sourceLinkedAbstracts` ✅ default-on | Page-level evidence + "Ver fuente" deep-link a la página citada del PDF persistido |
| 2 — Asistente IA (Moonshot tool-calling) | `asistenteIA` | Chat real con 6 tools read-only: `getContractsExpiringIn`, `getTenantsWithSalesDropAbove`, `getContractByStore`, `getOccupationCostOver`, `getRankingByCategory`, `getDailyDigest` |
| 3 — Cláusulas y derechos | `clausulasLedger` | Segundo pase sobre el PDF fuente: exclusividad, co-arrendamiento, renovación, kick-out, uso restringido, gracia |
| 4 — Stacking plan + occupancy timeline | `stackingPlan` | Grid por nivel coloreado por lifecycle, scrubber -12 / +36 meses |
| 5 — Renewal scoring | `renewalScoring` | Score 0–100 transparente con 7 factores (`buildRenewalScore`); badge + audit expander en `LocatarioDetail` |
| 6 — Casual / short-term licensing | `casualLicensing` | Entidad ligera para kioscos / ATMs / pop-ups / eventos |
| 7 — Tenant PWA | `tenantPwa` | `manifest.webmanifest` + service worker (`public/sw.js`) cache-first + push handler. Subscribers vía `/api/notifications/push/*` |
| 8 — CAM reconciliation | `camReconciliation` | Distribución de partidas operativas por GLA o plana; per-tenant expected/collected/Δ |
| 9 — Cross-shopping signals | `crossShopping` | Pearson sobre ventas mensuales (≥4 meses overlap) + lead/lag a 1 mes |
| 10 — Crisis broadcast | `crisisBroadcast` | `POST /api/broadcasts` admin-only, evacuación con two-person confirm. Web push registry listo; SMS / WhatsApp stubs `unconfigured` |
| 11 — MallIQ Index Chile | `mallqIndex` | Proposal — no construir hasta tener cobertura multi-cliente anonimizada |
| 12 — Scenario modeling v1 | `scenarioModeling` | Calculadora what-if local en `ContractEditor` (rent shifts, % variable, ventas proyectadas) |

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

### Autofill contractual + Track 1 (page-level provenance)

- `POST /api/contracts/autofill` (PDF, requiere rol writer).
- Preferencia: Moonshot → OpenAI → mock local (con `source: 'mock_local'`).
- Backend normaliza fechas, montos, escalonados.
- **Track 1 v1**: cada extracción IA persiste el PDF en `documents/` y devuelve `evidencePages` con el número de página donde apareció cada cita; el `ContractEditor` muestra "Ver fuente · p. N" sobre cada campo y abre `/api/documents/<id>/download#page=N`. Mock local no persiste (no hay provenance que defender).

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
| `POST` | `/api/contracts/autofill` | Extrae datos contractuales desde PDF (writer) — Track 1 ahora devuelve `evidencePages` + persiste `sourceDocument` |
| `POST` | `/api/contracts/autofill/ask` | Variante conversacional del autofill (writer) |
| `POST` | `/api/contracts/:id/clauses/extract` | Track 3 — segundo pase clasificador de cláusulas sobre el PDF fuente persistido (writer) |
| `POST` | `/api/asistente/chat` | Track 2 — chat IA con tool-calling sobre el portafolio (writer) |
| `POST` | `/api/broadcasts` | Track 10 — disparo de broadcast multi-canal (admin only; evacuación pide two-person confirm) |
| `GET` | `/api/notifications/push/vapid-public` | Track 7 — clave pública VAPID (vacía si no configurada) |
| `POST` | `/api/notifications/push/subscribe` | Track 7 — registra suscripción push del usuario |
| `POST` | `/api/notifications/push/unsubscribe` | Track 7 — elimina suscripción push por endpoint |

## Estructura

```text
src/
  components/
    layout/{AppLayout,Sidebar,Navbar}.tsx
    marketing/Shell.tsx
    mallq/{ui.tsx,helpers.ts}
    app/{TenantUsersSection,UfOverrideModal,ActivityLogSection,ContractEditor,...}.tsx
    {AuthGate,RoleGuards,Toast,ConfirmDialog,InteractiveMap,NotificationDrawer,...}.tsx
  pages/
    PortalSelector.tsx
    NotFound.tsx
    marketing/{Landing,Producto,Operadores,Locatarios,Pricing,Manifiesto,Demo}.tsx
    admin/{Dashboard,Portafolio,AssetDetail,Locatarios,LocatarioDetail,RentasContratos,
           CargasDatos,Planeacion,Ecosistema,Alertas,Configuracion,
           Simulador,Asistente,DesignLab,
           CasualLicenses,CamReconciliation,ClausulasLedger,Broadcast}.tsx
    locatario/{Dashboard,Contrato,Ventas,PendingBinding}.tsx
  lib/{domain,portfolio,api,currency,theme,anomalies,useReducedMotion,
       cam,crossShopping,renewal,scenarios,stackingPlan,pwa,...}.ts
  store/appState.tsx
  styles/marketing.css
  index.css
  test/{contentLint,marketingLinks,logoLayout,setup}.ts(x)
server/
  index.js auth.js db.js uf.js anomalies.js env.js
  autofill/{richPrompt,postDerivations,pageTagging}.js
  asistente/tools.js
  clauses/extractor.js
  *.test.ts
infra/aws/                # llaves de despliegue (gitignored), DEPLOY.md
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

Cobertura actual (248 tests · 32 archivos):

- Dominio (`src/lib/domain.test.ts`, `src/lib/anomalies.test.ts`, `src/lib/regressions.test.ts`)
- Importers / auth (`src/lib/importers.test.ts`, `src/lib/auth.test.ts`)
- Componentes UI (`src/components/mallq/ui.test.tsx`, `src/components/layout/Navbar.test.tsx`)
- Guards (`src/components/RoleGuards.test.tsx`)
- Dashboard (`src/pages/admin/Dashboard.test.tsx`)
- Backend integración (`server/server.integration.test.ts`, `server/auth.integration.test.ts`, `server/uf.test.ts`)
- Regresiones K1–K8:
  - `src/test/contentLint.test.ts` — lint de locale: falla CI si aparecen referencias a México / CDMX / MXN / `+52` / `malliq.mx` / SAT / CFDI / nombres de personas inventadas / inversionistas inventados en marketing.
  - `src/test/marketingLinks.test.ts` — todo `<Link to>` y `<a href>` del árbol marketing resuelve a una ruta conocida, `mailto:`, `tel:` o URL externa `https://`.
  - `src/test/logoLayout.test.tsx` — `MkLogo` mantiene `width`/`height` HTML attrs, `flex-shrink:0` y `object-fit:contain` (regresión de deformación bajo flex).
  - `src/components/NotificationDrawer.test.tsx` — skeleton de hidratación, agrupación por categoría, error block de ingesta fallida, badge unread + `marcar leídas`, `aria-modal`/`aria-live`, GC de seen ids huérfanos.
  - `src/pages/admin/AssetDetail.test.tsx` — montaje del plano, fallback 404 para id inválido, `switchAsset` al navegar directo.
  - `src/components/app/ContractEditor.test.tsx` — preserva `scrollTop` cuando los paneles del autofill aparecen/crecen sobre el form anchor.
- Tracks 1–12:
  - `src/components/app/ContractEvidenceModal.test.tsx` — Track 1: deep-link `#page=N` y empty state cuando falta source PDF.
  - `src/components/app/StackingPlan.test.tsx` — Track 4: lifecycle bucketing al desplazar el scrubber.
  - `src/lib/portfolio.test.ts` — featureFlags + migración v2→v3.
  - `src/lib/cam.test.ts` — Track 8: distribución por GLA / plana, exclusión de vencidos.
  - `src/lib/crossShopping.test.ts` — Track 9: Pearson, anti-correlación, lead/lag a 1 mes.
  - `src/lib/renewal.test.ts` — Track 5: pesos suman 1, casos alto/bajo/na, factores expuestos.
  - `src/lib/scenarios.test.ts` — Track 12: Δ rentTotal, ocupancyChangePoints, currency tags.
  - `src/test/formatPeso.test.ts` — guard contra reintroducir `formatPeso` en código nuevo.
  - `src/pages/admin/Asistente.test.tsx` — A3 honest copy + greeting.
  - `server/autofill/pageTagging.test.ts` — Track 1: page-tagged evidence con accent/whitespace tolerance.
  - `server/asistente/tools.test.ts` — Track 2: 6 tool implementations + tool definitions schema.
  - `server/clauses/extractor.test.ts` — Track 3: clause type clamping, evidencia tagged.

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

- UI y copy en **es-CL**; nomenclatura de dominio también en español (`Locatarios`, `Contratos`, `Ventas`).
- Producto chileno: CLP/UF, RUT, `America/Santiago`, `+56`, `do-up.cl`, SII/DTE. No introducir referencias a otros mercados sin retirar el lint de `src/test/contentLint.test.ts`.
- El término funcional vigente es **Activo**, no "Mall".
- Usar `useCurrency()` para todo lo monetario (no `formatPeso` en código nuevo).
- Display editorial usa la familia `var(--font-display)` (Instrument Serif). Números tabulares usan `var(--font-mono)` (JetBrains Mono).
- **Accent (`--accent`, Claude coral)** = CTA primaria de énfasis; mint = salud-positiva; violet = IA/datos; amber = warning; coral = critical; sky = info.
- Animaciones consumen `var(--ease-emphasized | --ease-standard | --ease-out)` — no escribir `cubic-bezier(...)` literal en código nuevo. SVG SMIL gateado con `useReducedMotion()`.
- Glassmorphism con `backdrop-filter` requiere piso de opacidad ≥ 88% para mantener WCAG AA del texto.
- Marketing y cockpit son árboles de proveedores **separados** (ver `src/App.tsx`). Las páginas `mk-*` no comparten estado con el cockpit. Marketing está totalmente lazy-loaded (incluido `Landing`).
- Entidad legal en footer (`MALLIQ SPA`): placeholder pendiente de confirmación del owner.
