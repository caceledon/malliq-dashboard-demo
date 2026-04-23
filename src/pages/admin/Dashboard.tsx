import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  ExternalLink,
  FileText,
  Flame,
  Plug2,
  Receipt,
  Sparkles,
  TrendingDown,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { InteractiveMap } from '@/components/InteractiveMap';
import { AreaChart, Delta, Donut, HealthRing, Kpi, LifeChip, TenantLogo } from '@/components/mallq/ui';
import { getContractLifecycle } from '@/lib/domain';
import type { AlertItem, TenantSummary } from '@/lib/domain';
import type { PortfolioAssetSummary } from '@/lib/portfolio';
import { useCurrency } from '@/lib/currency';
import { useAppState } from '@/store/appState';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function monthKeyToLabel(month: string): string {
  const [, mm] = month.split('-');
  const idx = Number(mm) - 1;
  return MONTH_LABELS[idx] ?? month;
}

function shortMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function pctSign(n: number, d = 1): string {
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(d)}%`;
}

function today(): string {
  try {
    const fmt = new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return fmt.format(new Date());
  } catch {
    return new Date().toLocaleString();
  }
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { insights, state, assetSummaries, portfolioStats, activeAssetId, actions } = useAppState();
  const { formatCurrency } = useCurrency();

  const topTenants = useMemo(
    () => [...insights.tenantSummaries].sort((a, b) => b.salesPerM2 - a.salesPerM2).slice(0, 5),
    [insights.tenantSummaries],
  );

  const watchlist = useMemo(
    () =>
      [...insights.tenantSummaries]
        .filter((t) => t.healthScore <= 75 || t.lifecycle === 'por_vencer' || t.lifecycle === 'vencido')
        .slice(0, 5),
    [insights.tenantSummaries],
  );

  const activeUnitIds = useMemo(() => {
    const set = new Set<string>();
    state.contracts
      .filter((c) => getContractLifecycle(c) !== 'vencido')
      .forEach((c) => c.localIds.forEach((id) => set.add(id)));
    return set;
  }, [state.contracts]);

  const occupiedM2 = useMemo(
    () => state.units.filter((u) => activeUnitIds.has(u.id)).reduce((sum, u) => sum + u.areaM2, 0),
    [state.units, activeUnitIds],
  );
  const totalM2 = insights.totalAreaM2 || 1;
  const vacantM2 = Math.max(totalM2 - occupiedM2, 0);
  const occupancyRatio = occupiedM2 / totalM2;

  const salesTrend = insights.chartSeries.map((p) => p.sales);
  const salesLabels = insights.chartSeries.map((p) => monthKeyToLabel(p.month));
  const lastSales = salesTrend[salesTrend.length - 1] ?? 0;
  const prevSales = salesTrend[salesTrend.length - 2] ?? 0;
  const momSales = prevSales > 0 ? (lastSales - prevSales) / prevSales : 0;

  const rentTrend = insights.chartSeries.map((p) => p.rent);

  const salesBySource = {
    manual: state.sales.filter((s) => s.source === 'manual').reduce((acc, s) => acc + s.grossAmount, 0),
    ocr: state.sales.filter((s) => s.source === 'ocr').reduce((acc, s) => acc + s.grossAmount, 0),
    fiscal: state.sales.filter((s) => s.source === 'fiscal_printer').reduce((acc, s) => acc + s.grossAmount, 0),
    pos: state.sales.filter((s) => s.source === 'pos_connection').reduce((acc, s) => acc + s.grossAmount, 0),
  };

  const avgHealth = useMemo(() => {
    const vals = insights.tenantSummaries.map((t) => t.healthScore);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [insights.tenantSummaries]);
  const healthBelow65 = insights.tenantSummaries.filter((t) => t.healthScore < 65).length;
  const healthAbove90 = insights.tenantSummaries.filter((t) => t.healthScore >= 90).length;

  const renewalsSoon = insights.tenantSummaries.filter((t) => t.lifecycle === 'por_vencer').length;
  const expired = insights.tenantSummaries.filter((t) => t.lifecycle === 'vencido').length;
  const activeCount = insights.tenantSummaries.filter((t) => t.lifecycle === 'vigente').length;

  const avgSalesPerM2 = insights.averageSalesPerM2;

  const vacancies = insights.vacantUnits;

  return (
    <div className="fadeUp" style={{ padding: '24px 28px 56px' }}>
      {/* HERO STRIP */}
      <div
        className="mq-card"
        style={{
          padding: '22px 24px',
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -40,
            top: -40,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--umber), var(--umber-ink))',
            opacity: 0.08,
            filter: 'blur(20px)',
          }}
        />
        <div style={{ flex: 1, zIndex: 1, minWidth: 0 }}>
          <div className="t-eyebrow" style={{ marginBottom: 6 }}>
            {today()}
          </div>
          <h1 className="t-display" style={{ fontSize: 26, margin: 0, lineHeight: 1.1 }}>
            Hola, Christian.{' '}
            <span className="t-muted" style={{ fontWeight: 400 }}>
              {momSales > 0
                ? `las ventas crecen ${pctSign(momSales)} mes a mes si el ritmo actual se mantiene.`
                : momSales < 0
                  ? `las ventas ceden ${pctSign(momSales)} respecto al mes anterior.`
                  : 'revisa los indicadores operativos del día.'}
            </span>
          </h1>
          <div className="row-wrap" style={{ marginTop: 12, gap: 10 }}>
            <span className="chip ok">
              <span className="dot" />
              Ocupación {insights.occupancyPct.toFixed(1)}%
            </span>
            <span className="chip umber">
              <span className="dot" />
              AI Autofill · Moonshot
            </span>
            {insights.pendingSignatureContracts > 0 ? (
              <span className="chip info">
                <span className="dot" />
                {insights.pendingSignatureContracts} contratos en firma
              </span>
            ) : null}
            {renewalsSoon + expired > 0 ? (
              <span className="chip warn">
                <span className="dot" />
                {renewalsSoon + expired} vencimientos próximos
              </span>
            ) : null}
          </div>
        </div>
        <div className="row" style={{ gap: 8, zIndex: 1 }}>
          <button type="button" className="mq-btn" onClick={() => navigate('/admin/cargas')}>
            <Upload size={14} /> Cargar ventas
          </button>
          <button type="button" className="mq-btn" onClick={() => navigate('/admin/rentas')}>
            <FileText size={14} /> Contratos
          </button>
          <button type="button" className="mq-btn umber" onClick={() => navigate('/admin/activos')}>
            <Flame size={14} /> Ver heatmap
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <Kpi
          label="Ocupación"
          value={`${insights.occupancyPct.toFixed(1)}%`}
          trend={`${activeCount} locatarios activos · ${vacancies} vacantes`}
          sparkData={rentTrend.length > 0 ? rentTrend : [0, 0]}
          sparkColor="var(--ok)"
        />
        <Kpi
          label="Ventas del mes"
          value={shortMoney(lastSales || insights.monthlySales)}
          trend="vs mes anterior"
          delta={momSales}
          sparkData={salesTrend.length > 0 ? salesTrend : [0, 0]}
          sparkColor="var(--umber)"
        />
        <Kpi
          label="Renta proyectada"
          value={shortMoney(insights.monthlyRent)}
          trend="Fija + variable + GC"
          sparkData={rentTrend.length > 0 ? rentTrend : [0, 0]}
          sparkColor="var(--info)"
        />
        <Kpi
          label="Ventas / m²"
          value={shortMoney(avgSalesPerM2)}
          trend="Promedio portafolio"
          sparkData={salesTrend.length > 0 ? salesTrend : [0, 0]}
          sparkColor="var(--warn)"
        />
        <Kpi
          label="Salud promedio"
          value={String(avgHealth)}
          unit="/100"
          trend={`${healthAbove90} ≥90 · ${healthBelow65} <65`}
          sparkData={salesTrend.length > 0 ? salesTrend.map(() => avgHealth) : [0, 0]}
          sparkColor="var(--ok)"
        />
      </div>

      {/* PORTFOLIO COMPARISON STRIP — only when managing multiple assets */}
      {assetSummaries.length > 1 ? (
        <div className="mq-card" style={{ marginBottom: 18, overflow: 'hidden' }}>
          <div className="mq-card-hd">
            <div>
              <div className="t-eyebrow">Comparador · portafolio</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600 }}>
                {portfolioStats.assetCount} activos · {shortMoney(portfolioStats.monthlySales)} ventas agregadas
              </h3>
            </div>
            <button type="button" className="mq-btn sm" onClick={() => navigate('/admin/activos')}>
              Detalle
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(assetSummaries.length, 4)}, minmax(0, 1fr))`,
              gap: 1,
              background: 'var(--line)',
            }}
          >
            {assetSummaries.map((asset) => (
              <AssetCompareCell
                key={asset.id}
                asset={asset}
                active={asset.id === activeAssetId}
                onClick={() => {
                  if (asset.id !== activeAssetId) {
                    actions.switchAsset(asset.id);
                  } else {
                    navigate('/admin/activos');
                  }
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* HEATMAP HERO */}
      <div className="mq-card" style={{ marginBottom: 18, overflow: 'hidden' }}>
        <div className="mq-card-hd">
          <div>
            <div className="t-eyebrow">Mapa operativo</div>
            <h3
              style={{
                margin: '4px 0 2px',
                fontFamily: 'var(--display)',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--ink-1)',
                letterSpacing: '-0.01em',
              }}
            >
              Heatmap de ventas por m² · {state.asset?.name ?? 'Activo'}
            </h3>
            <div className="t-muted" style={{ fontSize: 12.5 }}>
              Click en un local para ver el detalle. Intensidad proporcional al rendimiento vs promedio.
            </div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <div className="seg">
              <button className="on" type="button">
                Ventas/m²
              </button>
              <button type="button">Foot traffic</button>
              <button type="button">Salud</button>
            </div>
            <button type="button" className="mq-btn sm" onClick={() => navigate('/admin/activos')}>
              <ExternalLink size={13} /> Expandir
            </button>
          </div>
        </div>
        <div style={{ padding: 18 }}>
          <InteractiveMap />
        </div>
        <div className="heat-legend">
          <span className="t-eyebrow">Ventas / m²</span>
          <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            &lt; {shortMoney(avgSalesPerM2 * 0.55)}
          </span>
          <div className="heat-ramp" />
          <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            &gt; {shortMoney(avgSalesPerM2 * 1.35)}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 11 }}>
            <span
              style={{
                width: 10,
                height: 10,
                background: 'var(--heat-vacant)',
                border: '1px solid var(--line)',
                borderRadius: 2,
              }}
            />
            Vacante
          </span>
          <div className="row" style={{ gap: 14, marginLeft: 'auto' }}>
            <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              {insights.totalUnits} locales
            </span>
            <span className="t-mono" style={{ fontSize: 11, color: 'var(--ink-3) ' }}>
              · {vacancies} vacantes
            </span>
          </div>
        </div>
      </div>

      {/* TWO COLUMN ROW */}
      <div className="mq-grid-2" style={{ marginBottom: 18 }}>
        {/* Sales trend */}
        <div className="mq-card">
          <div className="mq-card-hd">
            <div>
              <div className="t-eyebrow">Venta mensual</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--display)', fontSize: 16, fontWeight: 600 }}>
                {formatCurrency(lastSales || insights.monthlySales)}{' '}
                {momSales !== 0 ? (
                  <span
                    className="t-mono"
                    style={{
                      fontSize: 12,
                      color: momSales > 0 ? 'var(--ok)' : 'var(--danger)',
                      fontWeight: 400,
                      marginLeft: 6,
                    }}
                  >
                    {momSales > 0 ? '▲' : '▼'} {pctSign(momSales)}
                  </span>
                ) : null}
              </h3>
            </div>
            <div className="seg">
              <button type="button" className="on">
                12M
              </button>
              <button type="button">YTD</button>
              <button type="button">QTD</button>
            </div>
          </div>
          <div style={{ padding: '8px 10px 6px' }}>
            {salesTrend.length > 0 ? (
              <AreaChart data={salesTrend} labels={salesLabels} format={shortMoney} stroke="var(--umber)" />
            ) : (
              <div className="t-muted" style={{ padding: 40, textAlign: 'center', fontSize: 13 }}>
                Aún no hay ventas registradas.
              </div>
            )}
          </div>
          <div
            style={{
              padding: '10px 18px 14px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4,1fr)',
              gap: 14,
              borderTop: '1px solid var(--line)',
            }}
          >
            <MiniStat label="Manual" val={shortMoney(salesBySource.manual)} color="var(--ink-1)" />
            <MiniStat label="OCR" val={shortMoney(salesBySource.ocr)} color="var(--umber)" />
            <MiniStat label="Fiscal" val={shortMoney(salesBySource.fiscal)} color="var(--ok)" />
            <MiniStat label="POS" val={shortMoney(salesBySource.pos)} color="var(--info)" />
          </div>
        </div>

        {/* Occupancy + watchlist */}
        <div className="mq-card">
          <div className="mq-card-hd">
            <div>
              <div className="t-eyebrow">Ocupación</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--display)', fontSize: 16, fontWeight: 600 }}>
                {insights.occupancyPct.toFixed(1)}% del GLA
              </h3>
            </div>
            <button type="button" className="mq-btn sm" onClick={() => navigate('/admin/activos')}>
              Detalle
            </button>
          </div>
          <div className="mq-card-bd" style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <Donut value={isFinite(occupancyRatio) ? occupancyRatio : 0} size={120} stroke={14} color="var(--umber)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="t-muted" style={{ fontSize: 12 }}>
                  Ocupado
                </span>
                <span className="t-num">{new Intl.NumberFormat('es-CL').format(Math.round(occupiedM2))} m²</span>
              </div>
              <div className="mq-bar ok">
                <span style={{ width: `${Math.min(occupancyRatio * 100, 100).toFixed(1)}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0 8px' }}>
                <span className="t-muted" style={{ fontSize: 12 }}>
                  Vacante
                </span>
                <span className="t-num">{new Intl.NumberFormat('es-CL').format(Math.round(vacantM2))} m²</span>
              </div>
              <div className="mq-bar warn">
                <span style={{ width: `${Math.min((vacantM2 / totalM2) * 100, 100).toFixed(1)}%` }} />
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                {state.prospects.length} prospecto{state.prospects.length === 1 ? '' : 's'} activos para {vacancies}{' '}
                local{vacancies === 1 ? '' : 'es'} vacante{vacancies === 1 ? '' : 's'}.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* THREE COLUMN ROW */}
      <div className="mq-grid-3">
        {/* top performers */}
        <div className="mq-card">
          <div className="mq-card-hd">
            <div>
              <div className="t-eyebrow">Top ventas / m²</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600 }}>
                Rendimiento líder
              </h3>
            </div>
            <button type="button" className="mq-btn ghost sm" onClick={() => navigate('/admin/locatarios')}>
              Todos
            </button>
          </div>
          <div style={{ padding: '4px 6px' }}>
            {topTenants.length === 0 ? (
              <div className="t-dim" style={{ padding: 20, fontSize: 12.5 }}>
                Aún no hay ventas por locatario.
              </div>
            ) : (
              topTenants.map((t, i) => (
                <TopRow key={t.id} tenant={t} index={i} onClick={() => navigate(`/admin/locatarios/${t.id}`)} />
              ))
            )}
          </div>
        </div>

        {/* watchlist */}
        <div className="mq-card">
          <div className="mq-card-hd">
            <div>
              <div className="t-eyebrow">Watchlist · salud</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600 }}>
                Requieren atención
              </h3>
            </div>
            <span className="chip warn">
              <span className="dot" />
              {watchlist.length} casos
            </span>
          </div>
          <div style={{ padding: '4px 6px' }}>
            {watchlist.length === 0 ? (
              <div className="t-dim" style={{ padding: 20, fontSize: 12.5 }}>
                Ningún locatario por debajo del umbral.
              </div>
            ) : (
              watchlist.map((t, i) => (
                <WatchRow key={t.id} tenant={t} index={i} onClick={() => navigate(`/admin/locatarios/${t.id}`)} />
              ))
            )}
          </div>
        </div>

        {/* alerts feed */}
        <div className="mq-card">
          <div className="mq-card-hd">
            <div>
              <div className="t-eyebrow">Actividad · hoy</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600 }}>
                Feed operativo
              </h3>
            </div>
            <button type="button" className="mq-btn ghost sm" onClick={() => navigate('/admin/alertas')}>
              Ver todo
            </button>
          </div>
          <div style={{ padding: '4px 6px' }}>
            {insights.alerts.length === 0 ? (
              <div className="t-dim" style={{ padding: 20, fontSize: 12.5 }}>
                No hay alertas activas.
              </div>
            ) : (
              insights.alerts.slice(0, 5).map((a, i) => <AlertRow key={a.id ?? i} alert={a} index={i} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, val, color }: { label: string; val: string; color: string }) {
  return (
    <div>
      <div className="row" style={{ gap: 6, fontSize: 11, color: 'var(--ink-3)' }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
        {label}
      </div>
      <div className="t-num" style={{ fontSize: 14, marginTop: 4 }}>
        {val}
      </div>
    </div>
  );
}

function TopRow({ tenant, index, onClick }: { tenant: TenantSummary; index: number; onClick: () => void }) {
  return (
    <div
      className="row"
      style={{
        padding: '9px 12px',
        gap: 10,
        borderTop: index === 0 ? 0 : '1px solid var(--line)',
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      <span className="t-mono t-dim" style={{ width: 16, fontSize: 11 }}>
        #{index + 1}
      </span>
      <TenantLogo name={tenant.storeName} seed={tenant.id} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }} className="truncate">
          {tenant.storeName}
        </div>
        <div className="t-dim" style={{ fontSize: 11 }}>
          {tenant.category} · {tenant.localCodes.join(', ') || '—'}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="t-num" style={{ fontSize: 12.5 }}>
          {shortMoney(tenant.salesPerM2)}
          <span className="t-dim" style={{ fontWeight: 400 }}>
            /m²
          </span>
        </div>
        {tenant.salesPrevious > 0 ? (
          <Delta v={(tenant.salesCurrent - tenant.salesPrevious) / tenant.salesPrevious} />
        ) : (
          <span className="t-dim t-mono" style={{ fontSize: 11 }}>
            —
          </span>
        )}
      </div>
    </div>
  );
}

function WatchRow({ tenant, index, onClick }: { tenant: TenantSummary; index: number; onClick: () => void }) {
  return (
    <div
      className="row"
      style={{
        padding: '9px 12px',
        gap: 10,
        borderTop: index === 0 ? 0 : '1px solid var(--line)',
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      <HealthRing value={tenant.healthScore} size={34} stroke={3} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }} className="truncate">
          {tenant.storeName}
        </div>
        <div className="t-dim" style={{ fontSize: 11 }}>
          {tenant.category} · {tenant.localCodes.join(', ') || '—'}
        </div>
      </div>
      <LifeChip status={tenant.lifecycle} />
    </div>
  );
}

const ALERT_ICON: Record<AlertItem['type'], { I: LucideIcon; bg: string; fg: string }> = {
  critical: { I: TrendingDown, bg: 'var(--danger-soft)', fg: 'var(--danger)' },
  warning: { I: AlertTriangle, bg: 'var(--warn-soft)', fg: 'var(--warn)' },
  info: { I: Sparkles, bg: 'var(--info-soft)', fg: 'var(--info)' },
};

const ALERT_BY_HINT: { match: RegExp; I: LucideIcon }[] = [
  { match: /vencim|renov|contrato/i, I: Calendar },
  { match: /pos|sync|conector/i, I: Plug2 },
  { match: /venta/i, I: Receipt },
  { match: /ia|autofill|moonshot/i, I: Sparkles },
];

function AlertRow({ alert, index }: { alert: AlertItem; index: number }) {
  const style = ALERT_ICON[alert.type] ?? ALERT_ICON.info;
  const hinted = ALERT_BY_HINT.find((h) => h.match.test(`${alert.title} ${alert.description}`));
  const IconCmp = hinted?.I ?? style.I;
  return (
    <div
      className="row"
      style={{
        padding: '11px 12px',
        gap: 10,
        alignItems: 'flex-start',
        borderTop: index === 0 ? 0 : '1px solid var(--line)',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          background: style.bg,
          color: style.fg,
          flex: 'none',
        }}
      >
        <IconCmp size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }}>{alert.title}</div>
        <div className="t-dim" style={{ fontSize: 11.5, marginTop: 2 }}>
          {alert.description}
        </div>
      </div>
      <ArrowUpRight size={14} style={{ color: 'var(--ink-4)', flex: 'none' }} />
    </div>
  );
}

function AssetCompareCell({
  asset,
  active,
  onClick,
}: {
  asset: PortfolioAssetSummary;
  active: boolean;
  onClick: () => void;
}) {
  const ratio = asset.totalUnits > 0 ? asset.occupiedUnits / asset.totalUnits : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '14px 16px',
        textAlign: 'left',
        background: active ? 'var(--umber-wash)' : 'var(--card)',
        border: 0,
        borderLeft: active ? '2px solid var(--umber)' : '2px solid transparent',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div className="row" style={{ gap: 10, justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <div
            className="truncate"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: active ? 'var(--umber-ink)' : 'var(--ink-1)',
            }}
          >
            {asset.name}
          </div>
          <div className="t-dim truncate" style={{ fontSize: 11 }}>
            {asset.city ?? '—'}
          </div>
        </div>
        <Donut value={ratio} size={42} stroke={5} color={active ? 'var(--umber)' : 'var(--ink-2)'} />
      </div>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <span className="t-mono" style={{ fontSize: 11.5, color: 'var(--ink-1)' }}>
          {asset.occupancyPct.toFixed(1)}%
          <span className="t-dim" style={{ fontWeight: 400 }}> ocup.</span>
        </span>
        <span className="t-mono" style={{ fontSize: 11.5, color: 'var(--ink-1)' }}>
          {shortMoney(asset.monthlySales)}
          <span className="t-dim" style={{ fontWeight: 400 }}> ventas</span>
        </span>
        {asset.alertCount > 0 ? (
          <span className="chip warn" style={{ fontSize: 10.5, padding: '1px 8px' }}>
            <span className="dot" />
            {asset.alertCount}
          </span>
        ) : null}
      </div>
    </button>
  );
}

