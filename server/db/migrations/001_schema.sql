-- MallIQ Postgres schema v1
-- Multi-tenant con Row-Level Security por activo_id.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE signature_status AS ENUM ('pendiente', 'en_revision', 'parcial', 'firmado');
CREATE TYPE contract_lifecycle AS ENUM ('borrador', 'en_firma', 'vigente', 'por_vencer', 'vencido');
CREATE TYPE sale_source AS ENUM ('manual', 'ocr', 'fiscal_printer', 'pos_connection');
CREATE TYPE alert_severity AS ENUM ('critical', 'warning', 'info');
CREATE TYPE plan_type AS ENUM ('budget', 'forecast');
CREATE TYPE moneda AS ENUM ('CLP', 'UF', 'USD', 'UVR', 'UVA', 'UMA');

CREATE TABLE activos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        TEXT NOT NULL,
  ciudad        TEXT NOT NULL,
  region        TEXT NOT NULL,
  gla           NUMERIC(14,2) NOT NULL DEFAULT 0,
  moneda_base   moneda NOT NULL DEFAULT 'CLP',
  uf_actual     NUMERIC(14,4) NOT NULL DEFAULT 0,
  backend_url   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE locales (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activo_id     UUID NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  codigo        TEXT NOT NULL,
  etiqueta      TEXT NOT NULL,
  area_m2       NUMERIC(12,2) NOT NULL DEFAULT 0,
  nivel         TEXT,
  frente_m      NUMERIC(10,2),
  profundidad_m NUMERIC(10,2),
  categoria     TEXT,
  notas         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (activo_id, codigo)
);
CREATE INDEX idx_locales_activo ON locales(activo_id);

CREATE TABLE locatarios (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activo_id          UUID NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  razon_social       TEXT NOT NULL,
  nombre_comercial   TEXT NOT NULL,
  rut                TEXT,
  categoria          TEXT NOT NULL,
  contacto_nombre    TEXT,
  contacto_email     TEXT,
  contacto_telefono  TEXT,
  notas              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (activo_id, rut)
);
CREATE INDEX idx_locatarios_activo ON locatarios(activo_id);
CREATE INDEX idx_locatarios_razon ON locatarios(activo_id, razon_social);

CREATE TABLE contratos (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activo_id               UUID NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  locatario_id            UUID NOT NULL REFERENCES locatarios(id) ON DELETE RESTRICT,
  fecha_inicio            DATE NOT NULL,
  fecha_termino           DATE NOT NULL,
  renta_fija_clp          BIGINT NOT NULL DEFAULT 0,
  renta_base_uf_m2        NUMERIC(10,4) NOT NULL DEFAULT 0,
  porcentaje_variable     NUMERIC(6,3) NOT NULL DEFAULT 0,
  gastos_comunes          BIGINT NOT NULL DEFAULT 0,
  fondo_promocion         BIGINT NOT NULL DEFAULT 0,
  derecho_llave           BIGINT NOT NULL DEFAULT 0,
  garantia_monto          BIGINT NOT NULL DEFAULT 0,
  vencimiento_garantia    DATE,
  participacion_ventas_pct NUMERIC(6,3) NOT NULL DEFAULT 0,
  signature_status        signature_status NOT NULL DEFAULT 'pendiente',
  firmado_en              TIMESTAMPTZ,
  escalonados             JSONB NOT NULL DEFAULT '[]',
  condiciones             TEXT,
  health_pago_al_dia      BOOLEAN NOT NULL DEFAULT FALSE,
  health_entrega_ventas   BOOLEAN NOT NULL DEFAULT FALSE,
  health_nivel_venta      BOOLEAN NOT NULL DEFAULT FALSE,
  health_nivel_renta      BOOLEAN NOT NULL DEFAULT FALSE,
  health_percepcion_admin BOOLEAN NOT NULL DEFAULT FALSE,
  version                 BIGINT NOT NULL DEFAULT 1,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fecha_inicio <= fecha_termino),
  CHECK (porcentaje_variable BETWEEN 0 AND 100)
);
CREATE INDEX idx_contratos_activo ON contratos(activo_id);
CREATE INDEX idx_contratos_locatario ON contratos(locatario_id);
CREATE INDEX idx_contratos_garantia ON contratos(vencimiento_garantia) WHERE vencimiento_garantia IS NOT NULL;
CREATE INDEX idx_contratos_termino ON contratos(fecha_termino);

CREATE TABLE contrato_locales (
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  local_id    UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  PRIMARY KEY (contrato_id, local_id)
);
CREATE INDEX idx_contrato_locales_local ON contrato_locales(local_id);

CREATE TABLE ventas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activo_id        UUID NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  contrato_id      UUID REFERENCES contratos(id) ON DELETE SET NULL,
  etiqueta_tienda  TEXT NOT NULL,
  fuente           sale_source NOT NULL DEFAULT 'manual',
  ocurrido_en      DATE NOT NULL,
  monto_bruto      BIGINT NOT NULL,
  monto_neto       BIGINT,
  numero_ticket    TEXT,
  texto_crudo      TEXT,
  referencia_import TEXT,
  importado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fingerprint      TEXT NOT NULL,
  UNIQUE (activo_id, fingerprint)
);
CREATE INDEX idx_ventas_activo_fecha ON ventas(activo_id, ocurrido_en DESC);
CREATE INDEX idx_ventas_contrato_fecha ON ventas(contrato_id, ocurrido_en DESC) WHERE contrato_id IS NOT NULL;

CREATE TABLE venta_locales (
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  PRIMARY KEY (venta_id, local_id)
);

CREATE TABLE planning (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activo_id     UUID NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  contrato_id   UUID REFERENCES contratos(id) ON DELETE SET NULL,
  tipo          plan_type NOT NULL,
  mes           CHAR(7) NOT NULL,
  sales_amount  BIGINT NOT NULL DEFAULT 0,
  rent_amount   BIGINT NOT NULL DEFAULT 0,
  generated     BOOLEAN NOT NULL DEFAULT FALSE,
  nota          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_planning_lookup ON planning(activo_id, tipo, mes);

CREATE TABLE documentos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activo_id    UUID NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  entity_type  TEXT NOT NULL,
  entity_id    UUID NOT NULL,
  nombre       TEXT NOT NULL,
  tipo         TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL,
  s3_key_raw   TEXT,
  s3_key_proc  TEXT,
  nota         TEXT,
  subido_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_documentos_entidad ON documentos(activo_id, entity_type, entity_id);

CREATE TABLE alertas (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activo_id    UUID NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  severidad    alert_severity NOT NULL,
  titulo       TEXT NOT NULL,
  descripcion  TEXT NOT NULL,
  contrato_id  UUID REFERENCES contratos(id) ON DELETE SET NULL,
  local_id     UUID REFERENCES locales(id) ON DELETE SET NULL,
  leida        BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_alertas_activo ON alertas(activo_id, creado_en DESC);
CREATE INDEX idx_alertas_no_leidas ON alertas(activo_id) WHERE leida = FALSE;

-- RLS: aislamiento por activo. El backend hace `SET LOCAL app.activo_id = '...'`
-- dentro de cada transacción. Las superclaves (admin global) bypasean con role.
CREATE OR REPLACE FUNCTION current_activo_id() RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.activo_id', TRUE), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END; $$ LANGUAGE plpgsql STABLE;

ALTER TABLE activos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE locales      ENABLE ROW LEVEL SECURITY;
ALTER TABLE locatarios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning     ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas      ENABLE ROW LEVEL SECURITY;

CREATE POLICY activos_isolation      ON activos    USING (id = current_activo_id() OR current_activo_id() IS NULL);
CREATE POLICY locales_isolation      ON locales    USING (activo_id = current_activo_id() OR current_activo_id() IS NULL);
CREATE POLICY locatarios_isolation   ON locatarios USING (activo_id = current_activo_id() OR current_activo_id() IS NULL);
CREATE POLICY contratos_isolation    ON contratos  USING (activo_id = current_activo_id() OR current_activo_id() IS NULL);
CREATE POLICY ventas_isolation       ON ventas     USING (activo_id = current_activo_id() OR current_activo_id() IS NULL);
CREATE POLICY planning_isolation     ON planning   USING (activo_id = current_activo_id() OR current_activo_id() IS NULL);
CREATE POLICY documentos_isolation   ON documentos USING (activo_id = current_activo_id() OR current_activo_id() IS NULL);
CREATE POLICY alertas_isolation      ON alertas    USING (activo_id = current_activo_id() OR current_activo_id() IS NULL);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER touch_activos    BEFORE UPDATE ON activos    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_locales    BEFORE UPDATE ON locales    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_locatarios BEFORE UPDATE ON locatarios FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_contratos  BEFORE UPDATE ON contratos  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
