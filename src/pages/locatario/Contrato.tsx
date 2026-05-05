import { CalendarDays, Download, Eye, FileText, Landmark, Stamp } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { DocumentManager } from '@/components/app/DocumentManager';
import { RentStepGantt } from '@/components/app/RentStepGantt';
import { ContractPreviewModal } from '@/components/app/ContractPreviewModal';
import { diffInDays, getContractLifecycle } from '@/lib/domain';
import { formatDate } from '@/lib/format';
import { useCurrency } from '@/lib/currency';
import { useAppState } from '@/store/appState';
import { useToast } from '@/components/Toast';
import { LocatarioPendingBinding } from '@/pages/locatario/PendingBinding';

export function LocatarioContrato() {
  const { currentTenantId, insights, state, actions, authUser } = useAppState();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const summary = insights.tenantSummaries.find((item) => item.id === currentTenantId);
  const contract = state.contracts.find((item) => item.id === currentTenantId);
  const linkedUnits = contract ? state.units.filter((unit) => contract.localIds.includes(unit.id)) : [];

  const [previewId, setPreviewId] = useState<string | null>(null);

  if (authUser?.role === 'locatario' && !authUser.tenantContractId) {
    return <LocatarioPendingBinding />;
  }

  if (!summary || !contract) {
    return (
      <div className="p-6">
        <div className="glass-card p-6 text-sm text-[var(--sidebar-fg)]">No hay contrato cargado para este locatario.</div>
      </div>
    );
  }

  const lifecycle = getContractLifecycle(contract);
  const daysRemaining = diffInDays(new Date(), new Date(contract.endDate));
  const contractDocuments = state.documents.filter((document) => document.entityType === 'contract' && document.entityId === contract.id);
  const contractPdf = contractDocuments
    .filter((document) => document.kind === 'contrato')
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))[0];

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Mi contrato</h1>
          <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
            {summary.storeName} · {summary.localCodes.join(', ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (!contractPdf) {
                toast('warning', 'Sin PDF de contrato', 'Pídele al admin que cargue el PDF en "Documentos del contrato".');
                return;
              }
              setPreviewId(contractPdf.id);
            }}
            disabled={!contractPdf}
            title={contractPdf ? `Vista previa de ${contractPdf.name}` : 'Sin PDF cargado'}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Eye className="h-4 w-4" />
            Vista previa
          </button>
          <button
            type="button"
            onClick={() => {
              if (!contractPdf) {
                toast('warning', 'Sin PDF de contrato', 'Pídele al admin que cargue el PDF en "Documentos del contrato".');
                return;
              }
              actions.downloadDocument(contractPdf.id).catch((error) => {
                toast('error', 'No se pudo descargar', error instanceof Error ? error.message : 'desconocido');
              });
            }}
            disabled={!contractPdf}
            title={contractPdf ? `Descargar ${contractPdf.name}` : 'Sin PDF cargado'}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Descargar contrato
          </button>
        </div>
      </div>

      <ContractPreviewModal
        documentId={previewId}
        fileName={contractPdf?.name}
        onClose={() => setPreviewId(null)}
      />

      <div className="glass-card overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-[var(--hover-bg)]">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Activo</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">COD</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Tienda</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Rubro</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Inicio</th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Término</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">GLA</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Fija UF/m²</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Variable %</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Gasto común</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Fondo promo</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Venta promedio</th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Venta x m²</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-2 text-xs text-[var(--sidebar-fg)]">{state.asset?.name ?? '—'}</td>
              <td className="px-3 py-2 text-xs font-mono">{summary.localCodes.join(', ') || '—'}</td>
              <td className="px-3 py-2 text-sm font-semibold">{summary.storeName}</td>
              <td className="px-3 py-2 text-xs">{summary.category}</td>
              <td className="px-3 py-2 text-xs">{formatDate(summary.startDate)}</td>
              <td className="px-3 py-2 text-xs">{formatDate(summary.endDate)}</td>
              <td className="px-3 py-2 text-right text-xs">{summary.areaM2}</td>
              <td className="px-3 py-2 text-right text-xs">
                {summary.baseRentUF > 0 ? summary.baseRentUF.toFixed(2) : '—'}
              </td>
              <td className="px-3 py-2 text-right text-xs">{contract.variableRentPct}%</td>
              <td className="px-3 py-2 text-right text-xs">
                {summary.commonExpensesClp > 0
                  ? `${formatCurrency(summary.commonExpensesClp)} ${contract.commonExpensesCurrency ?? 'CLP'}`
                  : '—'}
              </td>
              <td className="px-3 py-2 text-right text-xs">
                {summary.fondoPromocionClp > 0
                  ? `${formatCurrency(summary.fondoPromocionClp)} ${contract.fondoPromocionCurrency ?? 'CLP'}`
                  : '—'}
              </td>
              <td className="px-3 py-2 text-right text-xs font-semibold">
                {formatCurrency(summary.salesCurrent)}
              </td>
              <td className="px-3 py-2 text-right text-xs">{formatCurrency(summary.ventaPorM2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Inicio" value={formatDate(contract.startDate)} icon={<CalendarDays className="h-4 w-4 text-blue-600" />} />
        <Metric label="Fin" value={formatDate(contract.endDate)} icon={<CalendarDays className="h-4 w-4 text-indigo-600" />} />
        <Metric label="Firma" value={contract.signatureStatus.replace('_', ' ')} icon={<FileText className="h-4 w-4 text-rose-600" />} />
        <Metric label="Días restantes" value={String(daysRemaining)} icon={<CalendarDays className="h-4 w-4 text-purple-600" />} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Renta fija UF/m²" value={contract.baseRentUF > 0 ? `${contract.baseRentUF.toFixed(1)} UF/m²` : 'No definida'} icon={<Landmark className="h-4 w-4 text-pink-600" />} />
        <Metric label="Renta variable" value={`${contract.variableRentPct}% venta`} icon={<Stamp className="h-4 w-4 text-amber-600" />} />
        <Metric label="Renta fija estimada" value={formatCurrency(summary.rentFixed)} icon={<Landmark className="h-4 w-4 text-emerald-600" />} />
        <Metric label="Reajuste" value={contract.escalation || 'N/D'} icon={<Stamp className="h-4 w-4 text-cyan-600" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold">Condiciones comerciales</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label="Locales asociados" value={summary.localCodes.join(', ')} />
            <Info label="Superficie total" value={`${summary.areaM2} m2`} />
            <Info label="Estado contractual" value={lifecycle.replace('_', ' ')} />
            <Info label="Documentos asociados" value={String(contractDocuments.length)} />
          </div>
          {contract.rentSteps.length > 0 ? (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Escalonado de renta</p>
              <div className="mt-3">
                <RentStepGantt steps={contract.rentSteps} contractStart={contract.startDate} contractEnd={contract.endDate} />
              </div>
            </div>
          ) : null}
          <div className="mt-5 rounded-2xl bg-[var(--hover-bg)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Cláusulas y observaciones</p>
            <p className="mt-2 text-sm leading-relaxed">{contract.conditions || 'No hay observaciones cargadas.'}</p>
            {contract.signedAt ? (
              <p className="mt-3 text-xs text-[var(--sidebar-fg)]">Firmado el {formatDate(contract.signedAt)}</p>
            ) : null}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold">Locales cubiertos</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {linkedUnits.map((unit) => (
              <div key={unit.id} className="rounded-2xl border border-[var(--border-color)] p-4">
                <p className="text-sm font-semibold">{unit.code}</p>
                <p className="text-xs text-[var(--sidebar-fg)]">{unit.label}</p>
                <p className="mt-2 text-sm">{unit.areaM2} m2</p>
                <p className="text-xs text-[var(--sidebar-fg)]">{unit.level}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DocumentManager entityType="contract" entityId={contract.id} title="Documentos del contrato" />

      <div className="space-y-4">
        {linkedUnits.map((unit) => (
          <DocumentManager key={unit.id} entityType="unit" entityId={unit.id} title={`Documentos del local ${unit.code}`} />
        ))}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">{label}</p>
          <p className="mt-2 text-lg font-semibold">{value}</p>
        </div>
        <div className="rounded-2xl bg-[var(--hover-bg)] p-3">{icon}</div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
