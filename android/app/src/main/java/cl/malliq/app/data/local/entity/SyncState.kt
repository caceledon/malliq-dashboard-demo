package cl.malliq.app.data.local.entity

enum class SyncState { SYNCED, PENDING_UPLOAD, PENDING_DELETE, CONFLICT }

enum class Moneda { CLP, UF, USD }

enum class Lifecycle { BORRADOR, EN_FIRMA, VIGENTE, POR_VENCER, VENCIDO }

enum class SignatureStatus { PENDIENTE, EN_REVISION, PARCIAL, FIRMADO }

enum class SaleSource { MANUAL, OCR, FISCAL_PRINTER, POS_CONNECTION }

enum class AlertSeverity { CRITICAL, WARNING, INFO }
