import { useRef, useState } from 'react';
import { Bot, CornerDownLeft, Loader2, Sparkles, User, Wand2 } from 'lucide-react';
import { askContractAutofill, resolveApiBase } from '@/lib/api';
import { useAppState } from '@/store/appState';

type ChatMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; suggestedUpdates: Record<string, string | number | null> | null; source: string };

export function AutofillChat({
  textSnippet,
  currentFields,
  onApplySuggestion,
}: {
  textSnippet: string | null;
  currentFields: Record<string, unknown>;
  onApplySuggestion: (updates: Record<string, string | number | null>) => void;
}) {
  const { state } = useAppState();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const question = draft.trim();
    if (!question || !textSnippet || busy) return;

    setError(null);
    setBusy(true);
    const newMessages: ChatMessage[] = [...messages, { role: 'user', text: question }];
    setMessages(newMessages);
    setDraft('');

    try {
      const apiBase = resolveApiBase(state.asset?.backendUrl);
      const result = await askContractAutofill(apiBase, {
        question,
        textSnippet,
        currentFields,
      });
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          text: result.answer,
          suggestedUpdates: result.suggestedUpdates,
          source: result.source,
        },
      ]);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error consultando al asistente.');
      setMessages(newMessages);
    } finally {
      setBusy(false);
    }
  };

  if (!textSnippet) return null;

  return (
    <div className="mq-card" style={{ overflow: 'hidden' }}>
      <div className="mq-card-hd">
        <div className="row" style={{ gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--umber-soft)',
              color: 'var(--umber-ink)',
            }}
          >
            <Sparkles size={14} />
          </div>
          <div>
            <div className="t-eyebrow">Asistente MallQ</div>
            <h3 style={{ margin: '2px 0 0', fontFamily: 'var(--display)', fontSize: 14, fontWeight: 600 }}>
              Consultar el contrato
            </h3>
          </div>
        </div>
        <span className="t-dim" style={{ fontSize: 10.5 }}>
          {textSnippet.length.toLocaleString('es-CL')} caracteres indexados
        </span>
      </div>
      <div
        ref={listRef}
        style={{
          maxHeight: 280,
          overflowY: 'auto',
          padding: '6px 14px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.length === 0 ? (
          <div className="t-dim" style={{ padding: '14px 4px', fontSize: 12.5, lineHeight: 1.55 }}>
            Haz preguntas como "¿Cuál es la fecha de inicio?", "¿Tiene garantía?", o "Corrige el canon variable".
            El asistente lee el recorte del PDF y puede sugerir correcciones a los campos del formulario.
          </div>
        ) : (
          messages.map((msg, idx) => <ChatBubble key={idx} msg={msg} onApply={onApplySuggestion} />)
        )}
      </div>
      {error ? (
        <div
          className="chip danger"
          role="alert"
          style={{ margin: '0 14px 10px', fontSize: 11.5 }}
        >
          <span className="dot" />
          {error}
        </div>
      ) : null}
      <div
        className="row"
        style={{
          gap: 8,
          padding: '10px 14px 14px',
          borderTop: '1px solid var(--line)',
          background: 'var(--paper-2)',
        }}
      >
        <input
          className="mq-input"
          style={{ flex: 1 }}
          placeholder="Preguntar al contrato…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={busy}
        />
        <button
          type="button"
          className="mq-btn umber sm"
          onClick={send}
          disabled={busy || !draft.trim()}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <CornerDownLeft size={12} />}
          Enviar
        </button>
      </div>
    </div>
  );
}

function ChatBubble({
  msg,
  onApply,
}: {
  msg: ChatMessage;
  onApply: (updates: Record<string, string | number | null>) => void;
}) {
  const isUser = msg.role === 'user';
  return (
    <div
      className="row"
      style={{
        gap: 10,
        alignItems: 'flex-start',
        padding: '8px 10px',
        borderRadius: 10,
        background: isUser ? 'var(--paper-2)' : 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          display: 'grid',
          placeItems: 'center',
          background: isUser ? 'var(--ink-2)' : 'var(--umber-soft)',
          color: isUser ? '#fff' : 'var(--umber-ink)',
          flex: 'none',
        }}
      >
        {isUser ? <User size={12} /> : <Bot size={12} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12.5,
            color: 'var(--ink-1)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5,
          }}
        >
          {msg.text}
        </div>
        {msg.role === 'assistant' && msg.suggestedUpdates && Object.keys(msg.suggestedUpdates).length > 0 ? (
          <div
            style={{
              marginTop: 8,
              padding: '6px 10px',
              borderRadius: 8,
              background: 'var(--umber-wash)',
              border: '1px solid var(--umber-soft)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span className="t-mono" style={{ fontSize: 11, color: 'var(--umber-ink)' }}>
              Sugerencia:{' '}
              {Object.entries(msg.suggestedUpdates).map(([k, v]) => (
                <span key={k}>
                  <b>{k}</b>={String(v)}{' '}
                </span>
              ))}
            </span>
            <button
              type="button"
              className="mq-btn sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => onApply(msg.suggestedUpdates!)}
            >
              <Wand2 size={11} /> Aplicar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
