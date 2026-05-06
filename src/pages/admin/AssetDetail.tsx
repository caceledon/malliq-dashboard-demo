import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Settings } from 'lucide-react';
import { useAppState } from '@/store/appState';
import { useCurrency } from '@/lib/currency';
import { Bento, KpiTile, TopBar } from '@/components/mallq/ui';
import { formatM } from '@/components/mallq/helpers';
import { InteractiveMap } from '@/components/InteractiveMap';

export function AssetDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { activeAssetId, assetSummaries, insights, actions } = useAppState();
  const { formatCurrency } = useCurrency();

  const summary = assetSummaries.find((item) => item.id === id);

  // Sync the active workspace to the route param so InteractiveMap (which reads
  // useAppState directly) renders units for the asset in the URL.
  useEffect(() => {
    if (id && id !== activeAssetId) {
      actions.switchAsset(id);
    }
  }, [id, activeAssetId, actions]);

  const kpis = useMemo(() => {
    if (!summary) return null;
    const occupancy = summary.totalUnits > 0 ? (summary.occupiedUnits / summary.totalUnits) * 100 : 0;
    return {
      units: `${summary.occupiedUnits}/${summary.totalUnits}`,
      occupancy: `${occupancy.toFixed(0)}%`,
      sales: formatM(summary.monthlySales),
      rent: formatCurrency(summary.monthlyRent),
      alerts: String(summary.alertCount),
    };
  }, [summary, formatCurrency]);

  // Asset id in URL doesn't match any loaded workspace.
  if (id && !summary) {
    return (
      <div className="page-enter p-4 md:p-6" style={{ paddingTop: 0 }}>
        <div className="glass-card p-6">
          <h2 className="text-base font-semibold">Activo no encontrado</h2>
          <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
            El activo solicitado no existe en este portafolio. Vuelve al listado para elegir otro.
          </p>
          <button
            type="button"
            className="mq-btn primary mt-4 inline-flex items-center gap-2"
            onClick={() => navigate('/admin/activos')}
          >
            <ArrowLeft className="h-4 w-4" /> Volver a portafolio
          </button>
        </div>
      </div>
    );
  }

  // Insights are computed against the active workspace; show a loading shell
  // until switchAsset has propagated.
  const stillSwitching = id !== activeAssetId;

  return (
    <div className="page-enter p-4 md:p-6" style={{ paddingTop: 0 }}>
      <TopBar
        eyebrow="Activo"
        title={
          <>
            {summary?.name ?? 'Activo'} <i style={{ fontStyle: 'italic', color: 'var(--violet-deep)' }}>· plano operativo</i>.
          </>
        }
        sub={
          summary
            ? `${summary.city}${summary.region ? ' · ' + summary.region : ''} · ${summary.totalUnits} locales · ${summary.activeContracts} contratos vigentes`
            : 'Cargando información del activo…'
        }
        right={
          <>
            <button
              type="button"
              className="mq-btn sm inline-flex items-center gap-2"
              onClick={() => navigate('/admin/activos')}
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>
            <button
              type="button"
              className="mq-btn sm inline-flex items-center gap-2"
              onClick={() => navigate('/admin/configuracion')}
            >
              <Settings className="h-4 w-4" /> Configurar
            </button>
            <button
              type="button"
              className="mq-btn primary sm"
              onClick={() => navigate('/admin/dashboard')}
            >
              Abrir cockpit
            </button>
          </>
        }
      />

      {kpis ? (
        <Bento style={{ marginBottom: 20 }}>
          <KpiTile span={3} eyebrow="Ocupación" value={kpis.occupancy} foot={`${kpis.units} locales con contrato`} color="var(--mint-deep)" />
          <KpiTile span={3} eyebrow="Ventas mes" value={kpis.sales} foot="Suma del activo" color="var(--violet)" />
          <KpiTile span={3} eyebrow="Renta mes" value={kpis.rent} foot="Fija + variable" color="var(--sky)" />
          <KpiTile span={3} eyebrow="Alertas" value={kpis.alerts} foot="Pendientes operativos" color="var(--coral)" />
        </Bento>
      ) : null}

      {stillSwitching ? (
        <div className="glass-card p-6 text-sm text-[var(--sidebar-fg)]">Cargando plano del activo…</div>
      ) : (
        <div className="space-y-6">
          <InteractiveMap />
          <TenantList />
        </div>
      )}
    </div>
  );

  function TenantList() {
    if (insights.tenantSummaries.length === 0) {
      return (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">Locatarios del activo</h3>
          </div>
          <p className="mt-3 text-sm text-[var(--sidebar-fg)]">
            Aún no hay contratos cargados para este activo. Carga contratos desde Rentas para que aparezcan aquí y en
            el plano.
          </p>
        </div>
      );
    }

    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">Locatarios del activo · {insights.tenantSummaries.length}</h3>
        </div>
        <div className="mt-4 grid gap-2">
          {insights.tenantSummaries.slice(0, 12).map((tenant) => {
            const unitCodes = tenant.localCodes.join(', ');
            return (
              <button
                key={tenant.id}
                type="button"
                onClick={() => navigate(`/admin/locatarios/${tenant.id}`)}
                className="rounded-2xl border border-[var(--border-color)] px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--hover-bg)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{tenant.storeName}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--sidebar-fg)]">
                      <MapPin className="h-3 w-3" /> {unitCodes || 'Sin local'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Ventas mes</p>
                    <p className="text-sm font-semibold">{formatCurrency(tenant.salesCurrent)}</p>
                  </div>
                </div>
              </button>
            );
          })}
          {insights.tenantSummaries.length > 12 ? (
            <button
              type="button"
              onClick={() => navigate('/admin/locatarios')}
              className="rounded-2xl border border-dashed border-[var(--border-color)] px-4 py-3 text-sm font-semibold text-[var(--sidebar-fg)] transition-colors hover:bg-[var(--hover-bg)]"
            >
              Ver los {insights.tenantSummaries.length} locatarios →
            </button>
          ) : null}
        </div>
      </div>
    );
  }
}
