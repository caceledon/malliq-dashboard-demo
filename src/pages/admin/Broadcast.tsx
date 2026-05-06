// Track 10 — crisis broadcast composer.
//
// Admin-only. Two-person confirmation is enforced server-side for severity
// "evacuacion"; the UI exposes the second admin's email/name as a required
// field for that severity. SMS and WhatsApp channels are surfaced but the
// server returns "unconfigured" until provider keys are wired.
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MegaphoneIcon, Send } from 'lucide-react';
import { TopBar } from '@/components/mallq/ui';
import { useAppState } from '@/store/appState';
import {
  resolveApiBase,
  sendBroadcast,
  type BroadcastSendPayload,
  type BroadcastSendResult,
} from '@/lib/api';

const SEVERITY: Array<{
  value: BroadcastSendPayload['severity'];
  label: string;
  detail: string;
  tone: string;
}> = [
  { value: 'aviso', label: 'Aviso', detail: 'Información operativa o cambios menores.', tone: 'sky' },
  { value: 'incidente', label: 'Incidente', detail: 'Eventos relevantes pero no inminentes.', tone: 'amber' },
  { value: 'evacuacion', label: 'Evacuación', detail: 'Riesgo a la vida; requiere two-person confirm.', tone: 'coral' },
];

const CHANNELS: Array<{ key: BroadcastSendPayload['channels'][number]; label: string; detail: string }> = [
  { key: 'web_push', label: 'Web push', detail: 'Notificación al portal locatario instalado como PWA.' },
  { key: 'email', label: 'Email', detail: 'Adaptador no implementado en v1 — requiere SMTP_URL.' },
  { key: 'sms', label: 'SMS', detail: 'Adaptador pendiente; queda registrado como "no configurado".' },
  { key: 'whatsapp', label: 'WhatsApp', detail: 'Adaptador pendiente (WhatsApp Business API).' },
];

export function Broadcast() {
  const { state, actions, isFeatureEnabled, authUser } = useAppState();
  const enabled = isFeatureEnabled('crisisBroadcast') && authUser?.role === 'admin';
  const apiBase = state.asset?.backendUrl ?? resolveApiBase();
  const broadcasts = useMemo(() => state.broadcasts ?? [], [state.broadcasts]);

  const [severity, setSeverity] = useState<BroadcastSendPayload['severity']>('aviso');
  const [audience, setAudience] = useState<BroadcastSendPayload['audience']>('tenants');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channels, setChannels] = useState<BroadcastSendPayload['channels']>(['web_push']);
  const [twoPersonConfirmedBy, setTwoPersonConfirmedBy] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BroadcastSendResult['broadcast'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) {
    return (
      <div className="page-enter p-4 md:p-6" style={{ paddingTop: 0 }}>
        <TopBar
          eyebrow="Broadcast"
          title={<>Próximamente.</>}
          sub="Activa la etiqueta experimental 'Broadcast de crisis' en Configuración. Solo admins pueden disparar broadcasts; evacuaciones requieren confirmación de un segundo admin."
        />
      </div>
    );
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (channels.length === 0) {
      setError('Selecciona al menos un canal.');
      return;
    }
    if (severity === 'evacuacion' && !twoPersonConfirmedBy.trim()) {
      setError('Evacuación requiere el email/nombre de un segundo admin que confirma.');
      return;
    }
    setBusy(true);
    try {
      const response = await sendBroadcast(apiBase, {
        severity,
        audience,
        title: title.trim(),
        body: body.trim(),
        channels,
        twoPersonConfirmedBy: twoPersonConfirmedBy.trim() || undefined,
      });
      actions.appendBroadcast({
        ...response.broadcast,
        triggeredBy: response.broadcast.triggeredBy ?? undefined,
      });
      setResult(response.broadcast);
      setTitle('');
      setBody('');
      setTwoPersonConfirmedBy('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falló el envío del broadcast.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-enter p-4 md:p-6" style={{ paddingTop: 0 }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 4, paddingTop: 16 }}>
        <Link to="/admin/dashboard" style={{ color: 'var(--ink-3)' }}>Cockpit</Link>
        <ChevronRight size={13} />
        <span style={{ color: 'var(--ink-1)', fontWeight: 500 }}>Broadcast</span>
      </nav>

      <TopBar
        eyebrow="Broadcast de crisis"
        title={<>Una alerta. Múltiples canales.</>}
        sub="Audiencia, canal y severidad configurables. Cada envío queda en bitácora con el resultado por canal."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <form className="glass-card p-5 space-y-4" onSubmit={onSubmit}>
          <header className="flex items-center gap-2">
            <MegaphoneIcon className="h-4 w-4 text-[var(--violet-deep)]" />
            <h3 className="text-sm font-semibold">Componer broadcast</h3>
          </header>
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Severidad</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {SEVERITY.map((option) => (
                <label
                  key={option.value}
                  className={`rounded-xl border p-3 text-xs cursor-pointer ${severity === option.value ? 'border-[var(--violet-deep)]' : 'border-[var(--border-color)]'}`}
                >
                  <input
                    type="radio"
                    name="severity"
                    value={option.value}
                    checked={severity === option.value}
                    onChange={() => setSeverity(option.value)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="text-[11px] text-[var(--sidebar-fg)]">{option.detail}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field label="Audiencia">
            <select
              value={audience}
              onChange={(event) => setAudience(event.target.value as BroadcastSendPayload['audience'])}
              className="input-field"
            >
              <option value="tenants">Locatarios</option>
              <option value="staff">Personal del activo</option>
              <option value="all">Todos</option>
            </select>
          </Field>

          <Field label="Título">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
              className="input-field"
            />
          </Field>
          <Field label="Mensaje">
            <textarea
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={4000}
              required
              className="input-field"
            />
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--sidebar-fg)]">Canales</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {CHANNELS.map((channel) => (
                <label key={channel.key} className="flex items-start gap-2 rounded-xl border border-[var(--border-color)] p-3 text-xs">
                  <input
                    type="checkbox"
                    checked={channels.includes(channel.key)}
                    onChange={(event) => {
                      const next = new Set(channels);
                      if (event.target.checked) next.add(channel.key);
                      else next.delete(channel.key);
                      setChannels(Array.from(next) as BroadcastSendPayload['channels']);
                    }}
                  />
                  <span>
                    <span className="block text-sm font-semibold">{channel.label}</span>
                    <span className="text-[11px] text-[var(--sidebar-fg)]">{channel.detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {severity === 'evacuacion' ? (
            <Field label="Confirmación de segundo admin (email)">
              <input
                value={twoPersonConfirmedBy}
                onChange={(event) => setTwoPersonConfirmedBy(event.target.value)}
                placeholder="otro-admin@empresa.cl"
                className="input-field"
                required
              />
            </Field>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-3 text-xs text-red-700">{error}</div>
          ) : null}
          {result ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
              <p className="font-semibold">Broadcast registrado</p>
              <ul className="mt-1 space-y-0.5">
                {result.results.map((entry) => (
                  <li key={entry.channel}>
                    <span className="font-mono uppercase">{entry.channel}</span>: {entry.status}
                    {entry.detail ? ` — ${entry.detail}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {busy ? 'Enviando…' : 'Disparar broadcast'}
          </button>
        </form>

        <section className="glass-card p-5">
          <h3 className="text-sm font-semibold">Histórico</h3>
          {broadcasts.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--sidebar-fg)]">Sin broadcasts aún.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border-color)]">
              {broadcasts.map((broadcast) => (
                <li key={broadcast.id} className="py-3">
                  <p className="text-sm font-semibold">
                    {broadcast.title}
                    <span className="ml-2 inline-flex rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[10px] uppercase tracking-wide">
                      {broadcast.severity}
                    </span>
                  </p>
                  <p className="text-xs text-[var(--sidebar-fg)]">
                    {new Date(broadcast.triggeredAt).toLocaleString('es-CL')} · {broadcast.audience}
                  </p>
                  <ul className="mt-1 text-[11px] text-[var(--sidebar-fg)]">
                    {broadcast.results.map((entry) => (
                      <li key={`${broadcast.id}-${entry.channel}`}>
                        <span className="font-mono uppercase">{entry.channel}</span>: {entry.status}
                        {entry.detail ? ` — ${entry.detail}` : ''}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[11px] text-[var(--sidebar-fg)]">
                    Acuses: {broadcast.acknowledgements.length}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[var(--sidebar-fg)]">{label}</span>
      {children}
    </label>
  );
}
