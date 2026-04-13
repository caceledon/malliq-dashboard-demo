import { CalendarDays, FileText, Landmark, Stamp } from 'lucide-react';
import type { ReactNode } from 'react';
import { DocumentManager } from '@/components/app/DocumentManager';
import { diffInDays, getContractLifecycle } from '@/lib/domain';
import { formatDate, formatPeso } from '@/lib/format';
import { useAppState } from '@/store/appState';

export function LocatarioContrato() {
  const { currentTenantId, insights, state } = useAppState();
  const summary = insights.tenantSummaries.find((item) => item.id === currentTenantId);
  const contract = state.contracts.find((item) => item.id === currentTenantId);
  const linkedUnits = contract ? state.units.filter((unit) => contract.localIds.includes(unit.id)) : [];

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

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Mi contrato</h1>
        <p className="mt-1 text-sm text-[var(--sidebar-fg)]">
          {summary.storeName} · {summary.localCodes.join(', ')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Vigencia" value={`${formatDate(contract.startDate)} - ${formatDate(contract.endDate)}`} icon={<CalendarDays className="h-4 w-4 text-blue-600" />} />
        <Metric label="Renta fija" value={formatPeso(contract.fixedRent)} icon={<Landmark className="h-4 w-4 text-emerald-600" />} />
        <Metric label="Renta variable" value={`${contract.variableRentPct}% venta`} icon={<Stamp className="h-4 w-4 text-amber-600" />} />
        <Metric label="Firma" value={contract.signatureStatus.replace('_', ' ')} icon={<FileText className="h-4 w-4 text-rose-600" />} />
        <Metric label="Días restantes" value={String(daysRemaining)} icon={<CalendarDays className="h-4 w-4 text-indigo-600" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold">Condiciones comerciales</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Info label="Locales asociados" value={summary.localCodes.join(', ')} />
            <Info label="Superficie total" value={`${summary.areaM2} m2`} />
            <Info label="Base UF" value={`${contract.baseRentUF.toFixed(1)} UF`} />
            <Info label="Reajuste" value={contract.escalation} />
            <Info label="Estado contractual" value={lifecycle.replace('_', ' ')} />
            <Info label="Documentos asociados" value={String(contractDocuments.length)} />
          </div>
          <div className="mt-4 rounded-2xl bg-[var(--hover-bg)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--sidebar-fg)]">Cláusulas y observaciones</p>
            <p className="mt-2 text-sm leading-relaxed">{contract.conditions || 'No hay observaciones cargadas.'}</p>
            {contract.signedAt ? (
              <p className="mt-3 text-xs text-[var(--sidebar-fg)]">Firmado el {formatDate(contract.signedAt)}</p>
            ) : null}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold">Locales cubiertos</h3>
          <div className="mt-4 space-y-3">
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
