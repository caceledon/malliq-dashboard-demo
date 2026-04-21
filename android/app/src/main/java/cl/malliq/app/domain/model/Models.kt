package cl.malliq.app.domain.model

import cl.malliq.app.data.local.entity.AlertSeverity
import cl.malliq.app.data.local.entity.Lifecycle
import cl.malliq.app.data.local.entity.Moneda
import cl.malliq.app.data.local.entity.SignatureStatus
import java.time.Instant
import java.time.LocalDate

data class Activo(
    val id: String,
    val nombre: String,
    val ciudad: String,
    val gla: Double,
    val monedaBase: Moneda,
    val ufActual: Double,
    val updatedAt: Instant
)

data class Locatario(
    val id: String,
    val razonSocial: String,
    val nombreComercial: String,
    val categoria: String,
    val saludPuntaje: Int,
    val riesgoDefault90d: Float
)

data class Contrato(
    val id: String,
    val activoId: String,
    val locatarioId: String,
    val localIds: List<String>,
    val fechaInicio: LocalDate,
    val fechaTermino: LocalDate,
    val rentaFijaClp: Long,
    val rentaBaseUfM2: Double,
    val porcentajeVariable: Double,
    val gastosComunes: Long,
    val fondoPromocion: Long,
    val garantiaMonto: Long,
    val vencimientoGarantia: LocalDate?,
    val escalonados: List<RentStep>,
    val signatureStatus: SignatureStatus,
    val saludScore: Int,
    val lifecycle: Lifecycle
)

data class RentStep(
    val id: String,
    val fechaInicio: LocalDate,
    val fechaTermino: LocalDate,
    val rentaFijaUfM2: Double
)

data class VentaDiaria(
    val fecha: LocalDate,
    val monto: Long
)

data class ResumenActivo(
    val activoId: String,
    val ocupacionPct: Double,
    val localesOcupados: Int,
    val localesVacantes: Int,
    val localesTotal: Int,
    val ventasMesActual: Long,
    val rentaMesActual: Long,
    val promedioVentasPorM2: Long,
    val contratosFirmados: Int,
    val contratosPendientesFirma: Int,
    val alertasCriticas: Int,
    val alertasWarning: Int
)

data class TenantSummary(
    val locatarioId: String,
    val contratoId: String,
    val razonSocial: String,
    val nombreComercial: String,
    val categoria: String,
    val areaM2: Double,
    val ventasMesActual: Long,
    val ventasMesAnterior: Long,
    val ventaPorM2: Long,
    val rentaFija: Long,
    val rentaVariable: Long,
    val rentaTotal: Long,
    val costoOcupacionPct: Double,
    val lifecycle: Lifecycle,
    val saludScore: Int,
    val vencimientoGarantia: LocalDate?
)

data class SaludLocatario(
    val puntaje: Int,
    val tendencia: Tendencia,
    val factoresRiesgo: List<FactorRiesgo>,
    val probabilidadDefault90d: Float
)

enum class Tendencia { SUBIENDO, ESTABLE, BAJANDO }

data class FactorRiesgo(
    val codigo: String,
    val descripcion: String,
    val peso: Float
)

data class Alerta(
    val id: String,
    val severidad: AlertSeverity,
    val titulo: String,
    val descripcion: String,
    val contratoId: String?,
    val creadoEn: Instant,
    val leida: Boolean
)
