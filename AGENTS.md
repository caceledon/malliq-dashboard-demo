# MallIQ — Agent Context

> Este archivo está pensado para agentes de IA. Describe estructura, stack, comandos, modelo de dominio y convenciones del proyecto.

## Project Overview

**MallIQ** es una aplicación SPA + sitio público para analítica operativa y gestión comercial de centros comerciales. Combina:

1. **Sitio de marketing** público (`/` + 6 páginas), editorial boutique en cream + ink + mint, *Instrument Serif* como display.
2. **Cockpit administrativo** (`/admin/*`) — bento de KPIs, mapa del activo, semáforo de salud A→E, contratos como timeline, simulador de renta, asistente IA.
3. **Portal del locatario** (`/locatario/*`) — vista pinneada al contrato del usuario.
4. **Backend Express + SQLite** con JWT, helmet/CSP, autofill IA y conectores fiscales.

UI y copy en **español**. Código de dominio también en español (`locatarios`, `contratos`, `ventas`).

> **Nomenclatura**: el término "Mall" fue refactorizado globalmente a **"Activo"** (`Asset`).

## Technology Stack

- **Frontend**: React 19 + TypeScript 5.9 + Vite 8
- **Styling**: Tailwind 4 + CSS variables editoriales (cream/ink/mint/violet/amber/coral/sky)
- **Tipografía**: Inter (UI) · *Instrument Serif* (display) · JetBrains Mono (numbers); todas autohospedadas vía `@fontsource`
- **Routing**: `react-router-dom` 7 con `HashRouter`. Marketing y cockpit son árboles separados.
- **State**: React Context en `src/store/appState.tsx`; `useCurrency`, `useTheme`, `useToast`. No hay Redux/Zustand.
- **Storage cliente**: `localStorage` (estado, prefs, UF cache) + `idb` (IndexedDB para blobs)
- **Charts**: `recharts` + componentes SVG editoriales nativos (`Spark`, `MallPlan`, `ContractTimeline`, `ForecastChart`, `CategoryDonut`, `CategoryHeatmap`, `ExpiryRiver`)
- **Icons**: `lucide-react`
- **Backend**: Express 5 + SQLite + JWT + bcrypt + helmet (CSP same-origin) + multer + `express-rate-limit`
- **AI / OCR**: `openai` SDK con Moonshot (`kimi-k2.5`) preferido, `tesseract.js`, `pdf-parse v2`
- **Tests**: Vitest + jsdom + `@testing-library/react` (150 tests · 13 archivos)
- **Producción**: AWS EC2 + Docker Compose + Caddy auto-HTTPS · `do-up.cl`

## Project Structure

```
├── src/
│   ├── main.tsx                 # Entry: imports fonts (Inter, Instrument Serif, JetBrains Mono) + index.css
│   ├── App.tsx                  # HashRouter; árboles separados marketing vs AppShell(=AuthGate+providers)
│   ├── index.css                # Token block (light cream :root + .dark inverted) + utility classes
│   ├── styles/
│   │   └── marketing.css        # Aislado bajo .mk { --bg/--fg/...override }
│   ├── store/
│   │   └── appState.tsx         # PortfolioState; useAppState() expone insights, assetSummaries, actions
│   ├── lib/
│   │   ├── domain.ts            # Tipos, KPIs, getContractLifecycle, buildDashboardInsights, UfLookup
│   │   ├── portfolio.ts         # Multi-asset state helpers + migraciones
│   │   ├── api.ts               # HTTP client (authFetch, fetchUfLatest, autofillContractFromPdf...)
│   │   ├── auth.ts              # Token storage, login/register, AuthRole, AuthUser
│   │   ├── currency.tsx         # CurrencyProvider con UF date-keyed cache + getUfFor/ensureUfFor
│   │   ├── theme.tsx            # ThemeProvider con mode 'dark'|'light'|'auto' (auto sigue prefers-color-scheme)
│   │   ├── anomalies.ts         # Modified z-score + sudden-drop detection (cliente)
│   │   ├── files.ts             # IndexedDB blobs
│   │   ├── importers.ts exporters.ts format.ts utils.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx    # Shell con sidebar + navbar (sin per-page title)
│   │   │   ├── Navbar.tsx       # ⌘K palette, currency seg, theme toggle, notification, /admin/asistente CTA
│   │   │   └── Sidebar.tsx      # Brand conic + Mall<i>iq</i>; sections: Operación / Gestión / IA+Sync
│   │   ├── marketing/
│   │   │   └── Shell.tsx        # MkLogo, MkHeader, MkFooter, MkPulse, MkPage
│   │   ├── mallq/
│   │   │   ├── ui.tsx           # Librería compartida (TopBar, KpiTile, HealthRing, …)
│   │   │   └── helpers.ts       # healthBucket, healthColor, formatM, formatPct, sparkPath, tenantColorClass
│   │   ├── app/
│   │   │   ├── TenantUsersSection.tsx   # Crear locatarios + CSV bulk import
│   │   │   ├── UfOverrideModal.tsx      # Override manual fecha+valor
│   │   │   ├── ActivityLogSection.tsx
│   │   │   ├── ContractEditor.tsx ContractPreviewModal.tsx
│   │   │   ├── DocumentManager.tsx SalesIngestionCenter.tsx
│   │   │   ├── SetupWizard.tsx TenantHealthRating.tsx
│   │   │   └── …
│   │   ├── AuthGate.tsx          # Probe /api/health → render login form si authRequired y sin token
│   │   ├── RoleGuards.tsx        # AdminOnly / LocatarioOnly
│   │   ├── NotificationDrawer.tsx CommandPalette.tsx ShortcutsHelp.tsx
│   │   ├── Toast.tsx UndoToast.tsx ConfirmDialog.tsx
│   │   ├── GatewayStatus.tsx InteractiveMap.tsx SkeletonLoader.tsx
│   ├── pages/
│   │   ├── PortalSelector.tsx        # /login (editorial split con tres portales)
│   │   ├── NotFound.tsx
│   │   ├── marketing/
│   │   │   ├── Landing.tsx           # /
│   │   │   ├── Producto.tsx          # /producto
│   │   │   ├── Operadores.tsx        # /operadores
│   │   │   ├── Locatarios.tsx        # /locatarios-info  (export name: LocatariosInfo)
│   │   │   ├── Pricing.tsx           # /pricing
│   │   │   ├── Manifiesto.tsx        # /manifiesto
│   │   │   └── Demo.tsx              # /demo
│   │   ├── admin/
│   │   │   ├── Dashboard.tsx         # Cockpit bento
│   │   │   ├── Portafolio.tsx        # Multi-activo
│   │   │   ├── Locatarios.tsx        # SemaforoStrip + tabla
│   │   │   ├── LocatarioDetail.tsx   # HealthRing + ComponentBars hero
│   │   │   ├── RentasContratos.tsx   # ContractTimeline river
│   │   │   ├── CargasDatos.tsx
│   │   │   ├── Planeacion.tsx
│   │   │   ├── Ecosistema.tsx
│   │   │   ├── Alertas.tsx           # 3 severity tiles + lista
│   │   │   ├── Configuracion.tsx     # Asset, sync, UF, theme, usuarios, activity
│   │   │   ├── Simulador.tsx         # What-if rent (R1)
│   │   │   └── Asistente.tsx         # Chat IA + autofill drop zone (P4d)
│   │   └── locatario/
│   │       ├── Dashboard.tsx
│   │       ├── Contrato.tsx
│   │       ├── Ventas.tsx
│   │       └── PendingBinding.tsx    # Empty state para locatarios sin tenant_contract_id
├── server/
│   ├── index.js                 # API Express; createApp/startServer; helmet CSP same-origin
│   ├── auth.js                  # JWT + bcrypt; ensureAuthSchema; allowedRoles=admin/member/locatario
│   ├── db.js                    # SQLite schema + helpers (incluye uf_rates, activities)
│   ├── uf.js                    # Fetcher mindicador.cl (5s timeout) + ensureUfRange/resolveUfForDate
│   ├── anomalies.js             # Mirror server-side de anomalies.ts
│   ├── env.js                   # Carga .env.local + .env
│   ├── server.integration.test.ts auth.integration.test.ts uf.test.ts
│   └── data/                    # SQLite + uploads/ (gitignored)
├── infra/aws/                   # Llaves SSH (gitignored)
├── docker-compose.prod.yml Dockerfile
├── deploy.ps1                   # Script GitHub Pages legacy
├── package.json vite.config.ts tsconfig.app.json eslint.config.js
└── README.md AGENTS.md
```

## Build & Development

```bash
npm install
npm run dev            # Vite frontend
npm run dev:api        # node --watch server/index.js
npm run dev:all        # ambos
npm run build          # tsc -b && vite build → dist/
npm run lint
npm run test
npm run test:watch
npm run preview
npm start              # production: node server/index.js (sirve dist/ + /api/*)
```

## Routing — Two Trees

`src/App.tsx` separa **marketing público** (sin providers, sin auth) de **AppShell** (con `AuthGate + ThemeProvider + CurrencyProvider + ToastProvider + AppStateProvider + UndoToastProvider + ActiveAssetThemeSync`).

```jsx
<HashRouter>
  <Routes>
    {/* PÚBLICO */}
    <Route path="/" element={<Landing/>} />
    <Route path="/producto" element={<Producto/>} />
    <Route path="/operadores" element={<Operadores/>} />
    <Route path="/locatarios-info" element={<LocatariosInfo/>} />
    <Route path="/pricing" element={<Pricing/>} />
    <Route path="/manifiesto" element={<Manifiesto/>} />
    <Route path="/demo" element={<Demo/>} />

    {/* AUTHED — necesita providers para que getAuthUser() funcione */}
    <Route path="/login" element={<AppShell><PortalSelector/></AppShell>} />
    <Route path="/admin/*" element={<AppShell><AppLayout/>+sub-routes</AppShell>} />
    <Route path="/locatario/*" element={<AppShell><AppLayout/>+sub-routes</AppShell>} />
  </Routes>
</HashRouter>
```

Los CTAs del marketing apuntan a `/login` (entrar) y `/demo` (formulario).

## Design System

### Tokens (`src/index.css`)

**Light** (`:root`) — cream + ink:
- `--bg, --bg-deep, --surface, --surface-2, --surface-3` (cream tones)
- `--ink-1, --ink-2, --ink-3, --ink-4` (charcoal cool/warm)
- `--hairline, --hairline-strong`

**Accents**:
- `--mint, --mint-deep, --mint-soft` — primario y salud-positiva
- `--violet, --violet-deep, --violet-soft` — IA / datos
- `--amber + --amber-soft` — warning
- `--coral + --coral-soft` — critical
- `--sky + --sky-soft` — info

**Health ramp** A→E (`--health-a/-b/-c/-d/-e`) con umbrales 88 / 76 / 60 / 44 (`healthBucket(score)`).

**Tipografía**:
- `--font-sans: Inter`
- `--font-display: 'Instrument Serif'`
- `--font-mono: 'JetBrains Mono'`

**Aliases legacy** (`--paper`, `--card`, `--umber`, `--line`, `--ok/--warn/--danger`) remappean a tokens nuevos para que páginas no tocadas sigan renderizando.

**Dark mode** (`.dark`) invierte al deep-ink palette y refresca todos los aliases.

### Utility classes

Editoriales: `mq-h1, mq-h2, mq-h3, mq-display, mq-italic, mq-eyebrow, mq-h-eyebrow, mq-num-xl/-l/-num/-s, mq-mono`.
Pills: `mq-pill` + `.mint/.violet/.amber/.coral/.sky` + `.dot`.
Cards: `mq-card` + `.elevated/.flat/.outlined/.glass`.
Bento: `mq-bento` (12-col) + hijos `.span-3/4/5/6/7/8/9/12`.
Density: `[data-density="cozy|compact"]`.

Marketing usa `mk-*` totalmente aislado bajo `.mk { ... }`.

### Componentes compartidos (`src/components/mallq/ui.tsx`)

```
TopBar(eyebrow,title,sub,right)        — header editorial estándar de cada página
Pill(tone)                              — wrapper sobre mq-pill
Spark(values,color,height,fill)         — sparkline responsivo (ResizeObserver)
BarStack(value,color)                   — barra de progreso simple
KpiTile(span,eyebrow,value,delta,spark,color,foot,onClick)  — bento KPI con sparkline
MiniKpi(label,value,delta,bar,…)        — variante con barra en vez de sparkline
HealthBar(score,bucket)                 — letra A-E + barra + score
SemaforoStrip(buckets:Record<A-E,n>)    — ribbon + 5-col total
ComponentBar(label,ok,detail)           — fila con check ✓/✕
HealthRing(value,size,stroke,showLabel) — ring con 5-color ramp
AiTask(eyebrow,title,body,cta)          — card violet-soft con halo
InsightCard(tone,title,body,action)     — card con borde lateral acentuado
Term(label,value), Stat(label,value,hint)
CategoryHeatmap(months,categories)
ExpiryRiver(counts)
ContractTimeline(contracts,today,height)
ForecastChart(past,base,low,high,months)
FootfallChart, CategoryDonut
MallPlan(stores,metric,selectedId,onSelect) — grid + intensidad por valor o salud
RentSteps(steps,today)                  — Gantt horizontal
ArrearsTimeline(months)                 — fila de pago/atraso/pendiente
TenantLogo, LifeChip, SigChip, Delta, Donut, Sparkline, AreaChart, Kpi (legacy)
Bento(children,style)                   — wrapper de mq-bento
```

### Helpers (`src/components/mallq/helpers.ts`)

```ts
healthBucket(score: number): 'A'|'B'|'C'|'D'|'E'   // 88/76/60/44
healthColor(bucket): string                          // var(--health-x)
formatM(n): string                                   // "$1.2M" / "$840K"
formatPct(n, signed?, decimals?): string
sparkPath(values, w, h, pad): {line, area}
tenantColorClass(seed): 'lc-1'..'lc-8'
heatFill(value, avg): string
```

## Domain Model — Contract

```ts
interface Contract {
  id, companyName, storeName, category, localIds[]
  startDate, endDate
  fixedRent, fixedRentCurrency?: 'UF'|'CLP'  // monto pactado, default CLP
  variableRentPct                             // % sobre ventas
  baseRentUF                                  // referencia UF/m² INFORMATIVA — no entra al cálculo
  commonExpenses + commonExpensesCurrency
  fondoPromocion + fondoPromocionCurrency
  garantiaMonto + garantiaMontoCurrency, garantiaVencimiento
  feeIngreso + feeIngresoCurrency
  rentSteps: RentStep[]
  signatureStatus: 'firmado'|'en_revision'|'pendiente'|'parcial'
  // Salud
  healthPagoAlDia, healthEntregaVentas, healthNivelVenta, healthNivelRenta, healthPercepcionAdmin
  …
}
```

### KPIs

```
fixedRent_clp     = convertAmountToClpAt(fixedRent, fixedRentCurrency, refDate, getUfFor)
variableRent_clp  = ventas × variableRentPct / 100
rentTotal_clp     = fixedRent_clp + variableRent_clp
costoOcupacionPct = (rentTotal + GC + fondo) / ventas
healthScorePct    = (#checks marcados) × 20            // 0/20/40/60/80/100
healthBucket      = A(≥88) / B(≥76) / C(≥60) / D(≥44) / E(<44)
```

`baseRentUF` no se multiplica por área. Si `baseRentUF > 0 && fixedRent === 0`, el `ContractEditor` muestra banner de revisión.

### UF date-keyed

`useCurrency().getUfFor(dateLike)` devuelve la UF de la fecha (con fallback a la previa más cercana, luego a `latestUfDate`, luego a `FALLBACK_UF=39000`). `ensureUfFor` hace fetch async deduplicado contra `/api/uf?date=…`. La UF se cachea en `localStorage` (`malliq-uf-rates-cache`, máx ~5 años).

### Roles & multi-tenant

- `AuthRole = 'admin' | 'member' | 'locatario'`.
- `users.tenant_contract_id` (+ opcional `asset_id`) pinnea un locatario a su contrato.
- `<AdminOnly>` redirige locatarios a `/locatario/dashboard`. `<LocatarioOnly>` redirige no-locatarios a `/admin/dashboard`.
- Backend protege rutas de escritura con `requireRole(['admin','member'])` (writer roles): `PUT /api/archive`, `POST/DELETE /api/documents`, `/api/connectors/*`, `/api/contracts/autofill[/ask]`.
- `requireRole` es no-op cuando `request.user` está undefined (modo single-user dev).

## Backend Architecture

- **App factory** `createApp({apiKey?})` + `startServer({port})` para tests.
- **Helmet** con CSP `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; frame-ancestors 'none'`.
- **Rate limiters scoped**:
  - `authLimiter` en `/api/auth/login`, `/api/auth/register`
  - `archiveWriteLimiter` (60/15min) en `PUT /api/archive`
  - `autofillLimiter` (10/min) en autofill
  - `healthLimiter` (300/min) en `/api/health`
- **Body limits**: 1mb global, 50mb solo en `PUT /api/archive`.
- **HTTP logger** silencioso por default; activable con `MALLIQ_HTTP_LOG=1`.
- **POS proxy** (`POST /api/connectors/pos/proxy`) bloquea localhost/redes privadas; timeout y límite de respuesta.
- **Activities log** en SQLite (`logActivity`/`getRecentActivities`) — admin-only en `/api/activities`.
- **UF cache** persistente en `uf_rates(date PK, value, fetched_at)`.
- **Daily digest** `/api/notifications/daily` agrega anomalías + renovaciones ≤30 días + actividad 24h.

## Endpoints

| Método | Ruta | Auth | Notas |
|--------|------|------|-------|
| GET | `/api/health` | público | revision, summary, authRequired/authBootstrapped, aiMode |
| POST | `/api/auth/register` | público o admin | Primer usuario libre; después requiere admin |
| POST | `/api/auth/login` | público | Devuelve `{token, user}` |
| GET | `/api/auth/me` | sesión | |
| GET | `/api/auth/users` | admin | |
| PATCH | `/api/auth/users/:id/tenant` | admin | Re-bind locatario↔contrato |
| GET | `/api/uf/latest` | público | mindicador.cl |
| GET | `/api/uf?date=YYYY-MM-DD` | público | con fallback al previo |
| GET | `/api/uf/range?from&to` | público | ensureUfRange + listUfRates |
| GET | `/api/notifications/daily` | sesión | Digest 24h |
| GET | `/api/activities` | admin | |
| GET | `/api/archive` | sesión | |
| PUT | `/api/archive` | writer | Control de revisión, 50mb body |
| POST | `/api/documents` | writer | multer |
| DELETE | `/api/documents/:id` | writer | |
| GET | `/api/documents/:id/download` | sesión | |
| POST | `/api/connectors/pos/proxy` | writer | SSRF blocking |
| POST | `/api/connectors/fiscal/ingest` | writer | text/file/PDF/imagen |
| POST | `/api/contracts/autofill` | writer | PDF → JSON normalizado |
| POST | `/api/contracts/autofill/ask` | writer | Variante conversacional |

## Code Style

- **TypeScript strict**, `noUnusedLocals: true`, `noUnusedParameters: true`.
- ES modules everywhere (`"type": "module"`).
- Imports usan alias `@/` para `src/`.
- Funcionales con hooks. Páginas grandes lazy-loaded en `App.tsx`.
- Tailwind utility-first. Clases custom en `src/index.css` (`mq-*`) y `src/styles/marketing.css` (`mk-*` aislado).
- Naming en español para entidades de dominio.
- No usar `formatPeso` en código nuevo — `useCurrency()` es la fuente de verdad.

## Testing

```bash
npm run lint
npm run test        # 150 tests · 13 archivos
```

- **Domain**: `src/lib/domain.test.ts`, `src/lib/anomalies.test.ts`
- **UI**: `src/components/mallq/ui.test.tsx` (Delta + HealthRing 5-color ramp; LifeChip; TenantLogo; Donut; Kpi)
- **Layout**: `src/components/layout/Navbar.test.tsx`
- **Guards**: `src/components/RoleGuards.test.tsx`
- **Page**: `src/pages/admin/Dashboard.test.tsx`
- **Backend integration**: `server/server.integration.test.ts`, `server/auth.integration.test.ts`, `server/uf.test.ts`

## Security

- Helmet con CSP same-origin (sin Google Fonts CDN — fuentes auto-hospedadas vía `@fontsource`).
- `MALLIQ_JWT_SECRET` requerido en producción.
- `API_KEY` opcional como bearer global adicional.
- POS proxy con SSRF allowlist.
- Sin telemetría externa.
- AI keys (`OPENAI_API_KEY`, `MOONSHOT_API_KEY`) solo desde env / `.env.local`.

## Deployment

### Producción (`do-up.cl`)

EC2 + Docker Compose + Caddy (auto-HTTPS) en `ec2-user@54.233.206.7:/opt/malliq`.

```bash
ssh -i infra/aws/malliq-key.pem ec2-user@54.233.206.7 \
  'cd /opt/malliq && git pull --ff-only && docker compose -f docker-compose.prod.yml up -d --build'
```

### Self-hosted

```bash
npm run build && npm start
```

El backend sirve `dist/` si existe + `/api/*` con fallback al `index.html` para la SPA.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `PORT` | API server port (default: 4000) |
| `API_KEY` | Optional global bearer token |
| `MALLIQ_JWT_SECRET` | Required in production for session signing |
| `MALLIQ_REQUIRE_AUTH` | `'1'` to force auth even without registered users |
| `MALLIQ_HTTP_LOG` | `'1'` to enable per-request logger (silent by default) |
| `VITE_API_BASE_URL` | Frontend API base override (default `/api`) |
| `OPENAI_API_KEY` | OpenAI key for autofill |
| `OPENAI_BASE_URL` | OpenAI-compatible base override |
| `MOONSHOT_API_KEY` | Moonshot key (preferred when present) |
| `MOONSHOT_BASE_URL` | Default `https://api.moonshot.ai/v1` |
| `CONTRACT_AUTOFILL_MODEL` | Default `kimi-k2.5` (Moonshot) or `gpt-4o-mini` (OpenAI) |
| `MALLIQ_DATA_DIR` | Backend data directory override |
| `MALLIQ_DB_PATH` | SQLite file path override |
