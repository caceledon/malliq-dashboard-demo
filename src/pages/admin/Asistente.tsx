import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Bot, FileText, Send, Sparkles, Upload } from 'lucide-react';
import { autofillContractFromPdf, resolveApiBase } from '@/lib/api';
import { InsightCard, TopBar } from '@/components/mallq/ui';
import { useAppState } from '@/store/appState';
import { useToast } from '@/components/Toast';
import { formatM, healthBucket } from '@/components/mallq/helpers';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

const QUICK_PROMPTS = [
  '¿Qué locatarios cayeron 20% este mes?',
  'Resume mi semáforo de salud',
  'Próximas renovaciones (90 días)',
  'Top 5 ventas / m²',
];

export function Asistente() {
  const { state, insights, portfolioStats, assetSummaries } = useAppState();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      role: 'bot',
      text: 'Hola Christian. Soy tu asistente. Conozco tu portafolio en tiempo real — pídeme un resumen, una alerta o una proyección y te respondo en lenguaje natural.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const apiBase = state.asset?.backendUrl ?? resolveApiBase();

  const localAnswer = (q: string): string => {
    const lower = q.toLowerCase();
    if (lower.includes('caída') || lower.includes('20%') || lower.includes('cayeron')) {
      const drop = insights.tenantSummaries.filter((t) => t.salesPrevious > 0 && (t.salesCurrent - t.salesPrevious) / t.salesPrevious <= -0.2);
      if (drop.length === 0) return 'Ningún locatario cayó ≥20% este mes.';
      return `Detecté ${drop.length} locatario${drop.length === 1 ? '' : 's'} con caída ≥20%: ${drop.map((t) => t.storeName).join(', ')}.`;
    }
    if (lower.includes('semáforo') || lower.includes('salud')) {
      const buckets = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      for (const t of insights.tenantSummaries) buckets[healthBucket(t.healthScorePct)] += 1;
      return `Semáforo: A ${buckets.A} · B ${buckets.B} · C ${buckets.C} · D ${buckets.D} · E ${buckets.E}.`;
    }
    if (lower.includes('renovaci') || lower.includes('vence')) {
      const today = new Date();
      const soon = state.contracts.filter((c) => {
        const end = new Date(c.endDate);
        if (Number.isNaN(end.getTime())) return false;
        const days = (end.getTime() - today.getTime()) / 86400000;
        return days >= 0 && days <= 90;
      });
      return soon.length === 0 ? 'No hay contratos por renovar en los próximos 90 días.' : `${soon.length} contrato${soon.length === 1 ? '' : 's'} por renovar: ${soon.slice(0, 5).map((c) => c.storeName).join(', ')}${soon.length > 5 ? '…' : ''}`;
    }
    if (lower.includes('top') || lower.includes('m²') || lower.includes('m2')) {
      const top = [...insights.tenantSummaries].sort((a, b) => b.salesPerM2 - a.salesPerM2).slice(0, 5);
      if (top.length === 0) return 'Aún no hay ventas para rankear.';
      return `Top: ${top.map((t, i) => `${i + 1}. ${t.storeName} (${formatM(t.salesPerM2)}/m²)`).join(' · ')}`;
    }
    return `Tengo ${insights.tenantSummaries.length} locatario${insights.tenantSummaries.length === 1 ? '' : 's'} y ${state.contracts.length} contrato${state.contracts.length === 1 ? '' : 's'} indexados en ${assetSummaries.length} activo${assetSummaries.length === 1 ? '' : 's'}. Hazme una pregunta concreta.`;
  };

  const send = (text?: string) => {
    const content = (text ?? draft).trim();
    if (!content) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: content };
    const botMsg: Message = { id: `b-${Date.now() + 1}`, role: 'bot', text: localAnswer(content) };
    setMessages((m) => [...m, userMsg, botMsg]);
    setDraft('');
  };

  const onAutofill = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const result = await autofillContractFromPdf(apiBase, file);
      const summary = `Procesé ${file.name}: ${result.companyName ?? '—'} · ${result.storeName ?? '—'} · ${result.startDate ?? '—'} → ${result.endDate ?? '—'}.`;
      setMessages((m) => [
        ...m,
        { id: `u-${Date.now()}`, role: 'user', text: `[PDF] ${file.name}` },
        { id: `b-${Date.now() + 1}`, role: 'bot', text: summary },
      ]);
      toast('success', 'Autofill procesado', file.name);
    } catch (error) {
      toast('error', 'Autofill falló', error instanceof Error ? error.message : 'desconocido');
    } finally {
      setBusy(false);
    }
  };

  const stats = useMemo(
    () => [
      { label: 'Activos', value: portfolioStats.assetCount },
      { label: 'Locales', value: portfolioStats.totalUnits },
      { label: 'Locatarios', value: insights.tenantSummaries.length },
      { label: 'Documentos', value: state.documents.length },
    ],
    [portfolioStats, insights.tenantSummaries.length, state.documents.length],
  );

  return (
    <div className="page-enter p-4 md:p-6" style={{ paddingTop: 0 }}>
      <TopBar
        eyebrow="Asistente IA"
        title={
          <>
            Tu cockpit, en{' '}
            <i style={{ fontStyle: 'italic', color: 'var(--violet-deep)' }}>lenguaje natural</i>.
          </>
        }
        sub="El asistente conoce tu portafolio en tiempo real. Pregunta por un locatario, una métrica o sube un contrato para autofill."
        right={
          <span className="mq-pill violet">
            <span className="dot" />
            kimi-k2.5 · context aware
          </span>
        }
      />

      <div className="mq-bento">
        {/* Chat column (8) */}
        <div className="mq-card span-8" style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 560 }}>
          <div style={{ flex: 1, padding: 22, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map((m) => (m.role === 'bot' ? <BotMsg key={m.id} text={m.text} /> : <UserMsg key={m.id} text={m.text} />))}
          </div>

          {/* Quick prompts */}
          <div style={{ padding: '0 22px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                className="mq-pill violet"
                style={{ cursor: 'pointer' }}
                onClick={() => send(p)}
              >
                {p}
              </button>
            ))}
          </div>

          <div
            style={{
              padding: 14,
              borderTop: '1px solid var(--hairline)',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              background: 'var(--surface-2)',
              borderRadius: '0 0 14px 14px',
            }}
          >
            <input
              type="text"
              placeholder="Pregunta lo que necesites — datos en tiempo real."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
              className="mq-input"
              style={{ flex: 1 }}
            />
            <button type="button" className="mq-btn primary" onClick={() => send()}>
              <Send size={14} /> Enviar
            </button>
          </div>
        </div>

        {/* Side panel (4) */}
        <div className="span-4" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Autofill drop zone */}
          <div
            className="mq-card ai-halo"
            style={{ padding: 18, cursor: busy ? 'wait' : 'pointer', textAlign: 'center' }}
            onClick={() => !busy && fileInputRef.current?.click()}
          >
            <Upload size={28} style={{ color: 'var(--violet)', marginBottom: 8 }} />
            <div className="mq-h2">Autofill de contrato</div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 6 }}>
              Suelta un PDF y el asistente extrae partes, plazo, renta y garantías al editor.
            </p>
            <input ref={fileInputRef} type="file" accept="application/pdf" hidden onChange={onAutofill} />
          </div>

          {/* Indexing stats */}
          <div className="mq-card" style={{ padding: 18 }}>
            <div className="mq-h-eyebrow">Indexación</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 10 }}>
              {stats.map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.label}</div>
                  <div className="mq-num-l" style={{ fontSize: 22 }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested insight */}
          <InsightCard
            tone="mint"
            title="Top performer del portafolio"
            body={
              insights.tenantSummaries.length > 0
                ? `${[...insights.tenantSummaries].sort((a, b) => b.salesPerM2 - a.salesPerM2)[0].storeName} lidera con ${formatM([...insights.tenantSummaries].sort((a, b) => b.salesPerM2 - a.salesPerM2)[0].salesPerM2)}/m².`
                : 'Aún no hay ventas suficientes para rankear.'
            }
          />
        </div>
      </div>
    </div>
  );
}

function BotMsg({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: 'var(--violet-soft)',
          color: 'var(--violet-deep)',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <Bot size={16} />
      </span>
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: 14,
          padding: '10px 14px',
          maxWidth: '80%',
          fontSize: 13.5,
          color: 'var(--ink-1)',
          lineHeight: 1.5,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function UserMsg({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: 'row-reverse' }}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: 'var(--mint-soft)',
          color: 'var(--mint-deep)',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        TÚ
      </span>
      <div
        style={{
          background: 'var(--ink-1)',
          color: 'var(--surface)',
          borderRadius: 14,
          padding: '10px 14px',
          maxWidth: '80%',
          fontSize: 13.5,
          lineHeight: 1.5,
        }}
      >
        {text}
      </div>
    </div>
  );
}

// kept to avoid unused-import lint while we evolve the imports
void Sparkles;
void FileText;
