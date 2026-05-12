import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, FileText, Sparkles, Upload, X } from 'lucide-react';
import { fetchDailyDigest, resolveApiBase, type DailyDigest } from '@/lib/api';
import {
  AiTask,
  Bento,
  CategoryHeatmap,
  Delta,
  ExpiryRiver,
  HealthRing,
  KpiTile,
  LifeChip,
  Pill,
  TenantLogo,
  TopBar,
} from '@/components/mallq/ui';
import { InteractiveMap } from '@/components/InteractiveMap';
import { Modal } from '@/components/ui/Modal';
import { diffInDays } from '@/lib/domain';
import type { AlertItem, TenantSummary } from '@/lib/domain';
import { useAppState } from '@/store/appState';
import { healthBucket, formatM } from '@/components/mallq/helpers';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function monthKeyToLabel(month: string): string {
  const [, mm] = month.split('-');
  const idx = Number(mm) - 1;
  return MONTH_LABELS[idx] ?? month;
}

function todayLabel(): string {
  try {
    return new Intl.DateTimeFormat('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString();
  }
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { insights, state } = useAppState();
  const [healthLegendOpen, setHealthLegendOpen] = useState(false);

  const topTenants = useMemo(
    () => [...insights.tenantSummaries].sort((a, b) => b.salesPerM2 - a.salesPerM2).slice(0, 5),
    [insights.tenantSummaries],
  );

  const watchlist = useMemo(
    () =>
      [...insights.tenantSummaries]
        .filter((t) => t.healthScorePct < 80 || t.lifecycle === 'por_vencer' || t.lifecycle === 'vencido')
        .slice(0, 5),
    [insights.tenantSummaries],
  );

  const salesTrend = useMemo(() => insights.chartSeries.map((p) => p.sales), [insights.chartSeries]);
  const rentTrend = useMemo(() => insights.chartSeries.map((p) => p.rent), [insights.chartSeries]);
  const lastSales = salesTrend[salesTrend.length - 1] ?? 0;
  const prevSales = salesTrend[salesTrend.length - 2] ?? 0;
  const momSales = prevSales > 0 ? (lastSales - prevSales) / prevSales : 0;

  const avgHealth = useMemo(() => {
    const vals = insights.tenantSummaries.map((t) => t.healthScorePct);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [insights.tenantSummaries]);
  const healthBelow65 = insights.tenantSummaries.filter((t) => t.healthScorePct < 65).length;
  const healthAbove90 = insights.tenantSummaries.filter((t) => t.healthScorePct >= 90).length;

  const activeCount = insights.tenantSummaries.filter((t) => t.lifecycle === 'vigente').length;

  const renewalQueue = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    return insights.tenantSummaries
      .filter((t) => t.lifecycle !== 'vencido' && t.endDate)
      .map((t) => ({ tenant: t, daysToEnd: diffInDays(todayDate, new Date(t.endDate)) }))
      .filter(({ daysToEnd }) => Number.isFinite(daysToEnd) && daysToEnd >= 0 && daysToEnd <= 90)
      .sort((a, b) => a.daysToEnd - b.daysToEnd);
  }, [insights.tenantSummaries]);



  const avgSalesPerM2 = insights.averageSalesPerM2;
  const vacancies = insights.vacantUnits;

  // Category heatmap mock built from real categories + sales (last 6 months)
  const heatmapData = useMemo(() => {
    if (insights.tenantSummaries.length === 0) return null;
    const cats = new Map<string, number[]>();
    for (const t of insights.tenantSummaries) {
      const key = t.category || 'Otros';
      if (!cats.has(key)) cats.set(key, new Array(insights.chartSeries.length).fill(0));
      const arr = cats.get(key)!;
      // Distribute the tenant's current monthly sales across the chart series proportionally
      const total = insights.chartSeries.reduce((s, p) => s + p.sales, 0) || 1;
      insights.chartSeries.forEach((p, i) => {
        arr[i] += (t.salesCurrent * p.sales) / total;
      });
    }
    const months = insights.chartSeries.map((p) => monthKeyToLabel(p.month));
    const categories = Array.from(cats.entries())
      .map(([name, values]) => ({ name, values }))
      .slice(0, 6);
    return { months, categories };
  }, [insights.chartSeries, insights.tenantSummaries]);

  const expiryBuckets = useMemo(() => {
    const within30 = renewalQueue.filter((r) => r.daysToEnd <= 30).length;
    const within60 = renewalQueue.filter((r) => r.daysToEnd > 30 && r.daysToEnd <= 60).length;
    const within90 = renewalQueue.filter((r) => r.daysToEnd > 60 && r.daysToEnd <= 90).length;
    return [
      { label: '≤ 30 días', count: within30, tone: 'coral' as const },
      { label: '31–60 días', count: within60, tone: 'amber' as const },
      { label: '61–90 días', count: within90, tone: 'mint' as const },
    ];
  }, [renewalQueue]);

  return (
    <div style={{ padding: '8px 28px 56px' }}>
      <DigestCard />

      <TopBar
        eyebrow={`Cockpit · ${todayLabel()}`}
        title={
          <>
            Panel de Control.{' '}
            <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>
              {momSales > 0
                ? `Crecimiento del ${(momSales * 100).toFixed(1)}% detectado.`
                : 'Inteligencia de portafolio en tiempo real.'}
            </span>
          </>
        }
        sub={`${insights.tenantSummaries.length} locatarios · ${state.units.length} locales en ${state.asset?.name ?? 'este activo'}`}
        right={
          <>
            <button type="button" className="mq-btn sm" onClick={() => navigate('/admin/cargas')}>
              <Upload size={14} /> Cargar ventas
            </button>
            <button type="button" className="mq-btn sm" onClick={() => navigate('/admin/rentas')}>
              <FileText size={14} /> Contratos
            </button>
            <button type="button" className="mq-btn primary sm" onClick={() => navigate('/admin/asistente')}>
              <Bot size={14} /> Asistente
            </button>
          </>
        }
      />

      {/* HERO BENTO: KPI tiles */}
      <Bento style={{ marginBottom: 20 }}>
        <KpiTile
          span={3}
          eyebrow="Ocupación"
          value={`${insights.occupancyPct.toFixed(1)}%`}
          spark={rentTrend.length > 0 ? rentTrend : [0, 0]}
          color="var(--mint-deep)"
          foot={`${activeCount} activos · ${vacancies} vacantes`}
        />
        <KpiTile
          span={3}
          eyebrow="Ventas del mes"
          value={formatM(lastSales || insights.monthlySales)}
          delta={momSales}
          spark={salesTrend.length > 0 ? salesTrend : [0, 0]}
          color="var(--violet)"
          foot="vs mes anterior"
        />
        <KpiTile
          span={2}
          eyebrow="Ingreso mín. garantizado"
          value={formatM(insights.monthlyMinGuaranteed)}
          spark={rentTrend.length > 0 ? rentTrend : [0, 0]}
          color="var(--sky)"
          foot={`Renta total proyectada ${formatM(insights.monthlyRent)}`}
        />
        <KpiTile
          span={2}
          eyebrow="Ventas / m²"
          value={formatM(avgSalesPerM2)}
          spark={salesTrend.length > 0 ? salesTrend : [0, 0]}
          color="var(--amber)"
          foot="Promedio del activo"
        />
        <KpiTile
          span={2}
          eyebrow="Salud promedio"
          value={`${avgHealth}/100`}
          color="var(--mint)"
          foot={`${healthAbove90} ≥90 · ${healthBelow65} <65 · click`}
          onClick={() => setHealthLegendOpen(true)}
        />
      </Bento>

      {/* MIDDLE: Activity feed (full width). Portfolio comparison lives in
          /admin/activos so the Cockpit stays scoped to the selected asset. */}
      <Bento style={{ marginBottom: 20 }}>
        <div className="mq-card span-12" style={{ padding: 0 }}>
          <div className="mq-card-hd">
            <div>
              <div className="mq-h-eyebrow">Actividad · hoy</div>
              <div className="mq-h2" style={{ marginTop: 6 }}>
                Feed operativo
              </div>
            </div>
            <button type="button" className="mq-btn ghost sm" onClick={() => navigate('/admin/alertas')}>
              Ver todo
            </button>
          </div>
          <div style={{ padding: '4px 6px 12px' }}>
            {insights.alerts.length === 0 ? (
              <div style={{ padding: 20, color: 'var(--ink-3)', fontSize: 12.5 }}>No hay alertas activas.</div>
            ) : (
              insights.alerts.slice(0, 6).map((a) => <AlertRow key={a.id} alert={a} />)
            )}
          </div>
        </div>
      </Bento>

      {/* BOTTOM: Heatmap (5) + Expiry River (4) + AI Task (3) */}
      <Bento style={{ marginBottom: 20 }}>
        <div className="span-5">
          {heatmapData ? (
            <CategoryHeatmap months={heatmapData.months} categories={heatmapData.categories} />
          ) : (
            <div className="mq-card" style={{ padding: 16, color: 'var(--ink-3)', fontSize: 12.5 }}>
              Sin ventas para construir el mapa de calor.
            </div>
          )}
        </div>
        <div className="span-4">
          <ExpiryRiver counts={expiryBuckets} />
        </div>
        <div className="span-3">
          <AiTask
            eyebrow="Asistente IA"
            title={
              <>
                Pregunta a tu <i style={{ fontStyle: 'italic', color: 'var(--violet-deep)' }}>cockpit</i>.
              </>
            }
            body="¿Qué locatarios cayeron 20% este mes? ¿Cuál es el ROI esperado del próximo refit? El asistente entiende tu portafolio."
            cta={
              <button
                type="button"
                onClick={() => navigate('/admin/asistente')}
                className="mq-btn violet sm"
                style={{ marginTop: 8 }}
              >
                <Sparkles size={13} /> Abrir asistente
              </button>
            }
          />
        </div>
      </Bento>

      {/* FLOOR PLAN — flagship view: every local rendered as a block,
          colored by contract lifecycle + health, hover/click to drill into
          the tenant. K7 restored this on a per-asset detail route; embedding
          it here too because users expect the map on the Cockpit. */}
      <div style={{ marginBottom: 20 }}>
        <InteractiveMap />
      </div>

      {/* TWO COLUMN: Top performers + Watchlist */}
      <Bento style={{ marginBottom: 20 }}>
        <div className="mq-card span-6" style={{ padding: 0 }}>
          <div className="mq-card-hd">
            <div>
              <div className="mq-h-eyebrow">Top ventas / m²</div>
              <div className="mq-h2" style={{ marginTop: 6 }}>
                Rendimiento líder
              </div>
            </div>
            <button type="button" className="mq-btn ghost sm" onClick={() => navigate('/admin/locatarios')}>
              Todos
            </button>
          </div>
          <div style={{ padding: '4px 6px 14px' }}>
            {topTenants.length === 0 ? (
              <div style={{ padding: 20, color: 'var(--ink-3)', fontSize: 12.5 }}>Aún no hay ventas por locatario.</div>
            ) : (
              topTenants.map((t, i) => <TopRow key={t.id} tenant={t} index={i} onClick={() => navigate(`/admin/locatarios/${t.id}`)} />)
            )}
          </div>
        </div>

        <div className="mq-card span-6" style={{ padding: 0 }}>
          <div className="mq-card-hd">
            <div>
              <div className="mq-h-eyebrow">Watchlist · salud</div>
              <div className="mq-h2" style={{ marginTop: 6 }}>
                Requieren atención
              </div>
            </div>
            <Pill tone={watchlist.length > 0 ? 'amber' : 'mint'}>{watchlist.length} casos</Pill>
          </div>
          <div style={{ padding: '4px 6px 14px' }}>
            {watchlist.length === 0 ? (
              <div style={{ padding: 20, color: 'var(--ink-3)', fontSize: 12.5 }}>Ningún locatario por debajo del umbral.</div>
            ) : (
              watchlist.map((t, i) => <WatchRow key={t.id} tenant={t} index={i} onClick={() => navigate(`/admin/locatarios/${t.id}`)} />)
            )}
          </div>
        </div>
      </Bento>

      {/* RENEWALS — keep the existing renewal queue widget */}
      <div className="mq-card" style={{ padding: 0 }}>
        <div className="mq-card-hd">
          <div>
            <div className="mq-h-eyebrow">Cola de renovaciones · 90 días</div>
            <div className="mq-h2" style={{ marginTop: 6 }}>
              Contratos por renovar
            </div>
          </div>
          <Pill tone={renewalQueue.length > 0 ? 'amber' : 'mint'}>
            {renewalQueue.length} contrato{renewalQueue.length === 1 ? '' : 's'}
          </Pill>
        </div>
        <div style={{ padding: '4px 6px 14px' }}>
          {renewalQueue.length === 0 ? (
            <div style={{ padding: 20, color: 'var(--ink-3)', fontSize: 12.5 }}>
              No hay contratos por vencer en los próximos 90 días.
            </div>
          ) : (
            renewalQueue.map(({ tenant, daysToEnd }, i) => (
              <RenewalRow
                key={tenant.id}
                tenant={tenant}
                daysToEnd={daysToEnd}
                index={i}
                onClick={() => navigate(`/admin/locatarios/${tenant.id}`)}
              />
            ))
          )}
        </div>
      </div>

      <HealthLegendModal open={healthLegendOpen} onClose={() => setHealthLegendOpen(false)} />
    </div>
  );
}

function AlertRow({ alert }: { alert: AlertItem }) {
  const tone =
    alert.type === 'critical' ? 'var(--coral)' : alert.type === 'warning' ? 'var(--amber)' : 'var(--sky)';
  const soft =
    alert.type === 'critical' ? 'var(--coral-soft)' : alert.type === 'warning' ? 'var(--amber-soft)' : 'var(--sky-soft)';
  return (
    <div style={{ padding: '10px 12px', display: 'flex', gap: 10, borderTop: '1px solid var(--hairline)' }}>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          background: soft,
          color: tone,
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {alert.type === 'critical' ? '!' : alert.type === 'warning' ? '⚠' : 'i'}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-1)' }} className="truncate">
          {alert.title}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>{alert.description}</div>
      </div>
    </div>
  );
}

function TopRow({ tenant, index, onClick }: { tenant: TenantSummary; index: number; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        cursor: 'pointer',
        borderTop: index === 0 ? 0 : '1px solid var(--hairline)',
      }}
    >
      <span className="mq-mono" style={{ width: 18, fontSize: 11, color: 'var(--ink-4)' }}>
        #{index + 1}
      </span>
      <TenantLogo name={tenant.storeName} seed={tenant.id} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }} className="truncate">
          {tenant.storeName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          {tenant.category} · {tenant.localCodes.join(', ') || '—'}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="mq-mono" style={{ fontSize: 12.5, color: 'var(--ink-1)' }}>
          {formatM(tenant.salesPerM2)}/m²
        </div>
        {tenant.salesPrevious > 0 ? <Delta v={(tenant.salesCurrent - tenant.salesPrevious) / tenant.salesPrevious} /> : null}
      </div>
    </div>
  );
}

function WatchRow({ tenant, index, onClick }: { tenant: TenantSummary; index: number; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        cursor: 'pointer',
        borderTop: index === 0 ? 0 : '1px solid var(--hairline)',
      }}
    >
      <HealthRing value={tenant.healthScorePct} size={36} stroke={3} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }} className="truncate">
          {tenant.storeName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          {tenant.category} · {tenant.localCodes.join(', ') || '—'}
        </div>
      </div>
      <LifeChip status={tenant.lifecycle} />
    </div>
  );
}

function RenewalRow({
  tenant,
  daysToEnd,
  index,
  onClick,
}: {
  tenant: TenantSummary;
  daysToEnd: number;
  index: number;
  onClick: () => void;
}) {
  const tone: 'mint' | 'amber' | 'coral' = daysToEnd <= 30 ? 'coral' : daysToEnd <= 60 ? 'amber' : 'mint';
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        cursor: 'pointer',
        borderTop: index === 0 ? 0 : '1px solid var(--hairline)',
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          background: tone === 'coral' ? 'var(--coral-soft)' : tone === 'amber' ? 'var(--amber-soft)' : 'var(--mint-soft)',
          color: tone === 'coral' ? 'var(--coral)' : tone === 'amber' ? 'var(--amber)' : 'var(--mint-deep)',
          fontSize: 11,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
        }}
      >
        ◷
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }} className="truncate">
          {tenant.storeName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          {tenant.category} · termina {tenant.endDate}
        </div>
      </div>
      <Pill tone={tone}>{daysToEnd === 0 ? 'hoy' : `${daysToEnd} día${daysToEnd === 1 ? '' : 's'}`}</Pill>
    </div>
  );
}

function HealthLegendModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const checks = [
    { label: 'Paga al día', detail: 'El locatario está al día con renta y gastos comunes.' },
    { label: 'Entrega ventas al día', detail: 'Reporta ventas mensualmente sin atrasos.' },
    { label: 'Nivel de venta aceptable', detail: 'Las ventas / m² están dentro del rango esperado.' },
    { label: 'Nivel de renta aceptable', detail: 'El costo de ocupación se mantiene bajo el umbral.' },
    { label: 'Percepción del administrador', detail: 'Trato, cumplimiento operativo, presentación del local.' },
  ];
  const tiers = [
    { score: 0, label: 'E · 0/100' },
    { score: 20, label: 'D · 20/100' },
    { score: 40, label: 'D · 40/100' },
    { score: 60, label: 'C · 60/100' },
    { score: 80, label: 'B · 80/100' },
    { score: 100, label: 'A · 100/100' },
  ];
  const bucketLabels: Record<string, string> = { A: '≥ 88', B: '76–87', C: '60–75', D: '44–59', E: '< 44' };
  void healthBucket;
  return (
    <Modal open={open} onClose={onClose}>
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 100,
        padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cómo se calcula la salud del locatario"
        onClick={(event) => event.stopPropagation()}
        className="mq-card"
        style={{ width: 540, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', padding: 24 }}
      >
        <div className="mq-h-eyebrow">Salud del locatario</div>
        <div className="mq-h2" style={{ marginTop: 8 }}>
          ¿Cómo se calcula?
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 8 }}>
          La salud es la cantidad de checks marcados (0 a 5) por contrato, normalizada a /100. Los buckets A–E
          se mapean por umbrales:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 12 }}>
          {(['A', 'B', 'C', 'D', 'E'] as const).map((k) => (
            <div
              key={k}
              style={{
                padding: 10,
                borderRadius: 10,
                background: 'var(--surface-2)',
                textAlign: 'center',
                fontFamily: 'var(--font-display)',
              }}
            >
              <div style={{ fontSize: 22, color: 'var(--ink-1)' }}>{k}</div>
              <div className="mq-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                {bucketLabels[k]}
              </div>
            </div>
          ))}
        </div>
        <ul style={{ margin: '14px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {checks.map((c) => (
            <li key={c.label} style={{ border: '1px solid var(--hairline)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{c.detail}</div>
            </li>
          ))}
        </ul>
        <div className="mq-h-eyebrow" style={{ marginTop: 16 }}>
          Mapeo a /100
        </div>
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tiers.map((tier) => (
            <span
              key={tier.score}
              style={{
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 999,
                border: '1px solid var(--hairline)',
                background: 'var(--surface)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {tier.label}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button type="button" className="mq-btn mint" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
    </Modal>
  );
}

const LAST_VISIT_KEY = 'malliq-last-visit';

function readLastVisit(): number {
  try {
    const raw = localStorage.getItem(LAST_VISIT_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function DigestCard() {
  const navigate = useNavigate();
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [lastVisit] = useState<number>(() => readLastVisit());

  useEffect(() => {
    let cancelled = false;
    fetchDailyDigest(resolveApiBase())
      .then((result) => {
        if (cancelled) return;
        setDigest(result);
      })
      .catch(() => {
        if (cancelled) return;
        setDigest(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter activities to only those since the last visit, when available.
  const sinceLast = useMemo(() => {
    if (!digest) return null;
    const cutoff = Math.max(lastVisit, new Date(digest.since).getTime());
    const recent = (digest.activities ?? []).filter((a) => {
      const ts = a?.created_at ? new Date(a.created_at).getTime() : 0;
      return ts >= cutoff;
    });
    return {
      activitiesSinceVisit: recent.length,
      anomalies: digest.counts.anomalies,
      renewals: digest.counts.renewals,
    };
  }, [digest, lastVisit]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
    } catch {
      // Storage may be disabled — silent fail is fine, the card just shows again next mount.
    }
  };

  if (dismissed || !sinceLast) return null;
  const total = sinceLast.activitiesSinceVisit + sinceLast.anomalies + sinceLast.renewals;
  if (total === 0) return null;

  return (
    <div
      className="mq-card"
      style={{
        marginBottom: 16,
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        borderColor: 'var(--violet-soft)',
        background: 'color-mix(in oklab, var(--violet-soft) 35%, var(--surface))',
      }}
      role="region"
      aria-label="Resumen desde tu última visita"
    >
      <Sparkles size={18} style={{ color: 'var(--violet-deep)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mq-h-eyebrow" style={{ marginBottom: 2 }}>
          Desde tu última visita
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {sinceLast.anomalies > 0 ? (
            <button
              type="button"
              onClick={() => navigate('/admin/alertas')}
              className="mq-link"
              style={{ background: 'none', border: 0, padding: 0, color: 'var(--coral)', cursor: 'pointer', fontWeight: 600 }}
            >
              {sinceLast.anomalies} anomalías nuevas
            </button>
          ) : null}
          {sinceLast.renewals > 0 ? (
            <button
              type="button"
              onClick={() => navigate('/admin/rentas')}
              className="mq-link"
              style={{ background: 'none', border: 0, padding: 0, color: 'var(--amber)', cursor: 'pointer', fontWeight: 600 }}
            >
              {sinceLast.renewals} contratos por vencer
            </button>
          ) : null}
          {sinceLast.activitiesSinceVisit > 0 ? (
            <span style={{ color: 'var(--ink-2)' }}>
              {sinceLast.activitiesSinceVisit} actividades registradas
            </span>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Marcar como visto"
        style={{
          background: 'none',
          border: 0,
          padding: 6,
          cursor: 'pointer',
          color: 'var(--ink-3)',
          display: 'inline-flex',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

