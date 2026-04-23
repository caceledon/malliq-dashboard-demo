import { useEffect, useMemo, useState } from 'react';

/**
 * Revisión split-screen del resultado de Autofill LLM.
 * Izquierda: PDF con overlay de fragmentos resaltados.
 * Derecha: campos editables con badge de confianza, sincronizados al foco.
 *
 * Uso: <AutofillSplitReview jobId="..." pdfUrl="..." onAplicar={...} />
 * Dependencia sugerida: `react-pdf` (no incluido aún); acá se abstrae el viewer
 * detrás de `PdfViewer` para permitir swap por pdf.js wasm o alternativa futura.
 */

export type AutofillCampo = {
  clave: string;
  valor: string;
  confianza: number;
  fragmento: string;
  pagina?: number;
  bbox?: { x: number; y: number; w: number; h: number };
};

type Props = {
  pdfUrl: string;
  campos: AutofillCampo[];
  onAplicar: (corregidos: AutofillCampo[]) => void;
  onCancelar: () => void;
};

const ETIQUETAS: Record<string, string> = {
  companyName: 'Razón social',
  storeName: 'Nombre del local',
  category: 'Categoría',
  startDate: 'Inicio contrato',
  endDate: 'Término contrato',
  baseRentUF: 'Renta base (UF/m²)',
  variableRentPct: 'Renta variable (%)',
  commonExpenses: 'Gastos comunes',
  fondoPromocion: 'Fondo promoción',
  garantiaMonto: 'Garantía (CLP)',
  garantiaVencimiento: 'Vencimiento garantía',
  feeIngreso: 'Fee de ingreso',
};

export function AutofillSplitReview({ pdfUrl, campos, onAplicar, onCancelar }: Props) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [foco, setFoco] = useState<number>(0);

  const valores = useMemo(
    () => campos.map((c) => (overrides[c.clave] !== undefined ? { ...c, valor: overrides[c.clave] } : c)),
    [campos, overrides],
  );
  const campoActivo = valores[foco];
  const pagina = campoActivo?.pagina ?? campos[0]?.pagina ?? 1;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        setFoco((f) => Math.min(f + 1, valores.length - 1));
      } else if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        setFoco((f) => Math.max(f - 1, 0));
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onAplicar(valores);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [valores, onAplicar]);

  const promedio = useMemo(() => {
    if (!valores.length) return 0;
    return valores.reduce((s, c) => s + c.confianza, 0) / valores.length;
  }, [valores]);

  return (
    <div
      className="fixed inset-0 z-[150] grid"
      style={{
        gridTemplateColumns: 'minmax(0, 1.15fr) minmax(420px, 0.85fr)',
        background: '#0A0D14',
      }}
    >
      <aside
        className="relative border-r"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0F1422' }}
      >
        <PdfViewer pdfUrl={pdfUrl} pagina={pagina} highlight={campoActivo?.bbox} />
        <div
          className="absolute left-6 top-6 px-3 py-1.5 rounded-full text-[11px] tracking-[0.14em] uppercase"
          style={{
            background: 'rgba(245,165,36,0.12)',
            color: '#F5A524',
            fontFamily: '"Söhne", "Inter", system-ui, sans-serif',
          }}
        >
          Fragmento citado · pág {pagina}
        </div>
      </aside>

      <section className="flex flex-col overflow-hidden">
        <header
          className="px-8 py-6 flex items-center justify-between border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div>
            <div
              className="text-[11px] tracking-[0.14em] uppercase"
              style={{ color: '#8C92A6' }}
            >
              Autofill de contrato
            </div>
            <h2
              className="text-[26px] mt-1"
              style={{ color: '#ECEEF3', fontFamily: '"Söhne Breit", "Neue Haas Grotesk Display", "Inter Display", system-ui, sans-serif' }}
            >
              Revisa y confirma
            </h2>
          </div>
          <ConfianzaPromedio valor={promedio} />
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-5">
          {valores.map((campo, index) => (
            <CampoEditable
              key={campo.clave}
              campo={campo}
              index={index}
              activo={index === foco}
              onFocus={() => setFoco(index)}
              onChange={(valor) => {
                setOverrides((prev) => ({ ...prev, [campo.clave]: valor }));
              }}
            />
          ))}
        </div>

        <footer
          className="px-8 py-4 flex items-center justify-between border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0F1422' }}
        >
          <div className="flex items-center gap-3 text-[12px]" style={{ color: '#5A6075' }}>
            <Atajo k="Tab" label="siguiente" />
            <Atajo k="⇧Tab" label="anterior" />
            <Atajo k="⌘↵" label="aplicar" />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancelar}
              className="px-4 py-2 text-[13px] rounded-md"
              style={{
                color: '#8C92A6',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={() => onAplicar(valores)}
              className="px-5 py-2 text-[13px] rounded-md font-medium"
              style={{ color: '#0A0D14', background: '#F5A524' }}
            >
              Aplicar al contrato
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function CampoEditable({
  campo,
  index,
  activo,
  onFocus,
  onChange,
}: {
  campo: AutofillCampo;
  index: number;
  activo: boolean;
  onFocus: () => void;
  onChange: (v: string) => void;
}) {
  const color = campo.confianza >= 0.85 ? '#4CA38A'
              : campo.confianza >= 0.6 ? '#F5A524'
              : '#E57373';
  return (
    <div
      className="mb-4 rounded-[14px] px-5 py-4 transition-all"
      style={{
        background: activo ? 'rgba(245,165,36,0.06)' : 'rgba(255,255,255,0.02)',
        borderLeft: `2px solid ${activo ? '#F5A524' : 'transparent'}`,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-[6px] h-[6px] rounded-full"
            style={{ background: color }}
          />
          <span
            className="text-[11px] tracking-[0.14em] uppercase"
            style={{ color: '#8C92A6' }}
          >
            {ETIQUETAS[campo.clave] ?? campo.clave}
          </span>
        </div>
        <span
          className="text-[10px]"
          style={{ color, fontFamily: '"JetBrains Mono", ui-monospace' }}
        >
          {(campo.confianza * 100).toFixed(0)}% confianza
        </span>
      </div>
      <input
        value={campo.valor}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={index + 1}
        className="w-full bg-transparent outline-none text-[18px]"
        style={{
          color: '#ECEEF3',
          fontFamily: '"JetBrains Mono", ui-monospace',
        }}
      />
      {activo && campo.fragmento && (
        <div
          className="mt-3 p-3 text-[12px] leading-[1.55] rounded-md"
          style={{
            color: '#F5A524',
            background: 'rgba(245,165,36,0.06)',
            border: '1px solid rgba(245,165,36,0.16)',
            fontFamily: '"JetBrains Mono", ui-monospace',
          }}
        >
          "{campo.fragmento}"
        </div>
      )}
    </div>
  );
}

function ConfianzaPromedio({ valor }: { valor: number }) {
  const pct = Math.round(valor * 100);
  const color = valor >= 0.85 ? '#4CA38A' : valor >= 0.6 ? '#F5A524' : '#E57373';
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 rounded-full"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="relative w-[28px] h-[28px]">
        <svg width="28" height="28" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="16" cy="16" r="14" fill="none"
            stroke={color} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 88} 88`}
            transform="rotate(-90 16 16)"
          />
        </svg>
      </div>
      <div>
        <div className="text-[11px] tracking-[0.12em] uppercase" style={{ color: '#8C92A6' }}>
          Confianza global
        </div>
        <div className="text-[15px]" style={{ color, fontFamily: '"JetBrains Mono", ui-monospace' }}>
          {pct}%
        </div>
      </div>
    </div>
  );
}

function Atajo({ k, label }: { k: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <kbd
        className="px-1.5 py-0.5 rounded text-[10px]"
        style={{
          color: '#8C92A6',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontFamily: '"JetBrains Mono", ui-monospace',
        }}
      >{k}</kbd>
      <span>{label}</span>
    </div>
  );
}

/**
 * Stub del viewer. Sustituir por `react-pdf` cuando se añada la dependencia.
 * Recibe `pagina` y `highlight` (bbox en coords normalizadas 0..1) para dibujar
 * el resaltado sincronizado con el campo activo.
 */
function PdfViewer({ pdfUrl, pagina, highlight }: { pdfUrl: string; pagina: number; highlight?: AutofillCampo['bbox'] }) {
  return (
    <div className="relative w-full h-full">
      <iframe
        src={`${pdfUrl}#page=${pagina}&view=FitH`}
        title="Contrato"
        className="w-full h-full"
        style={{ border: 'none', background: '#0A0D14' }}
      />
      {highlight && (
        <div
          className="pointer-events-none absolute rounded"
          style={{
            left: `${highlight.x * 100}%`,
            top: `${highlight.y * 100}%`,
            width: `${highlight.w * 100}%`,
            height: `${highlight.h * 100}%`,
            background: 'rgba(245,165,36,0.18)',
            boxShadow: '0 0 0 1px rgba(245,165,36,0.55)',
            transition: 'all 250ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        />
      )}
    </div>
  );
}
