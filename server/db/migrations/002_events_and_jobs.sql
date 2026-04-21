-- Event store append-only para SSE y colaboración, más autofill_jobs y auditoría.

CREATE TABLE eventos_dominio (
  id           BIGSERIAL PRIMARY KEY,
  activo_id    UUID NOT NULL,
  tipo         TEXT NOT NULL,
  entidad      TEXT NOT NULL,
  entidad_id   UUID NOT NULL,
  actor        TEXT,
  payload      JSONB NOT NULL,
  version      BIGINT NOT NULL DEFAULT 1,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_eventos_activo_id ON eventos_dominio(activo_id, id);
CREATE INDEX idx_eventos_entidad ON eventos_dominio(entidad, entidad_id);

CREATE OR REPLACE FUNCTION notificar_evento() RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'malliq_events',
    json_build_object(
      'id', NEW.id,
      'activoId', NEW.activo_id,
      'tipo', NEW.tipo,
      'entidad', NEW.entidad,
      'entidadId', NEW.entidad_id
    )::text
  );
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER eventos_notify
  AFTER INSERT ON eventos_dominio
  FOR EACH ROW EXECUTE FUNCTION notificar_evento();

-- Autofill jobs: pipeline asíncrono PDF -> LLM -> JSON estructurado.
CREATE TYPE autofill_status AS ENUM ('pending', 'running', 'done', 'failed');

CREATE TABLE autofill_jobs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activo_id     UUID NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  documento_id  UUID REFERENCES documentos(id) ON DELETE SET NULL,
  s3_key        TEXT NOT NULL,
  estado        autofill_status NOT NULL DEFAULT 'pending',
  campos        JSONB,
  raw_text      TEXT,
  error         TEXT,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completado_en TIMESTAMPTZ
);
CREATE INDEX idx_autofill_jobs_activo ON autofill_jobs(activo_id, creado_en DESC);

-- Correcciones humanas a autofill: usadas para fine-tuning del modelo.
CREATE TABLE autofill_correcciones (
  id            BIGSERIAL PRIMARY KEY,
  job_id        UUID NOT NULL REFERENCES autofill_jobs(id) ON DELETE CASCADE,
  campo         TEXT NOT NULL,
  valor_llm     TEXT,
  valor_humano  TEXT,
  confianza_llm NUMERIC(4,3),
  corregido_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auditoría inmutable de mutaciones (SOX-ready).
CREATE TABLE audit_log (
  id             BIGSERIAL PRIMARY KEY,
  activo_id      UUID,
  actor          TEXT NOT NULL,
  actor_ip       INET,
  accion         TEXT NOT NULL,
  entidad        TEXT NOT NULL,
  entidad_id     UUID,
  diff           JSONB,
  razon          TEXT,
  user_agent     TEXT,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_activo ON audit_log(activo_id, creado_en DESC);
CREATE INDEX idx_audit_entidad ON audit_log(entidad, entidad_id);

-- Índices diarios (UF, UVR, UVA, UMA) alimentados por worker diario.
CREATE TABLE indices_diarios (
  moneda moneda NOT NULL,
  fecha  DATE   NOT NULL,
  valor  NUMERIC(14,6) NOT NULL,
  fuente TEXT,
  PRIMARY KEY (moneda, fecha)
);

-- Salud predicha de locatarios, actualizada por Lambda cada 6 horas.
CREATE TABLE locatario_salud_predicho (
  locatario_id        UUID PRIMARY KEY REFERENCES locatarios(id) ON DELETE CASCADE,
  activo_id           UUID NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  puntaje             INTEGER NOT NULL CHECK (puntaje BETWEEN 0 AND 100),
  tendencia           TEXT NOT NULL CHECK (tendencia IN ('subiendo','estable','bajando')),
  prob_default_90d    NUMERIC(4,3) NOT NULL,
  factores_riesgo     JSONB NOT NULL DEFAULT '[]',
  calculado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_salud_activo ON locatario_salud_predicho(activo_id, puntaje);

ALTER TABLE autofill_jobs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE locatario_salud_predicho ENABLE ROW LEVEL SECURITY;

CREATE POLICY autofill_isolation ON autofill_jobs            USING (activo_id = current_activo_id() OR current_activo_id() IS NULL);
CREATE POLICY salud_isolation    ON locatario_salud_predicho USING (activo_id = current_activo_id() OR current_activo_id() IS NULL);
