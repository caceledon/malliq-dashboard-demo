/**
 * Tokens canónicos de MallIQ (modo oscuro dominante).
 * Consumidos por Tailwind (via tailwind.config) y por utilidades inline.
 */
export const tokens = {
  color: {
    background: '#0A0D14',
    surface: {
      base: '#0F1422',
      elevated: '#131826',
      overlay: 'rgba(255,255,255,0.06)',
      hairline: 'rgba(255,255,255,0.08)',
    },
    accent: {
      ambar: '#F5A524',
      ambarSuave: '#FFC871',
    },
    estado: {
      pino: '#1F6F5C',
      pinoClaro: '#4CA38A',
      terracota: '#C64545',
      terracotaClaro: '#E57373',
      dato: '#4C8EDA',
    },
    texto: {
      primario: '#ECEEF3',
      secundario: '#8C92A6',
      terciario: '#5A6075',
    },
  },
  fuente: {
    display: '"Söhne Breit", "Neue Haas Grotesk Display", "Inter Display", ui-sans-serif, system-ui, sans-serif',
    sans: '"Söhne", "Inter", ui-sans-serif, system-ui, sans-serif',
    mono: '"Söhne Mono", "JetBrains Mono", ui-monospace, "Cascadia Code", monospace',
  },
  radius: {
    xs: '6px', sm: '10px', md: '14px', lg: '20px', xl: '28px',
  },
  shadow: {
    card: '0 1px 2px rgba(0,0,0,0.5), 0 12px 24px rgba(0,0,0,0.25)',
    focus: '0 0 0 2px rgba(245,165,36,0.45)',
  },
  motion: {
    swift: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    stagger: 80,
  },
} as const;

export type Tokens = typeof tokens;
