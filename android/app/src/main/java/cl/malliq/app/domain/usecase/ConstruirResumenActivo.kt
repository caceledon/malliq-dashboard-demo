package cl.malliq.app.domain.usecase

import cl.malliq.app.data.local.entity.Lifecycle
import cl.malliq.app.data.local.entity.SignatureStatus
import cl.malliq.app.domain.model.FinanceMath
import cl.malliq.app.domain.model.ResumenActivo
import cl.malliq.app.domain.repository.AlertaRepository
import cl.malliq.app.domain.repository.ContratoRepository
import cl.malliq.app.domain.repository.LocalRepository
import cl.malliq.app.domain.repository.VentaRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flowOf
import java.time.LocalDate
import javax.inject.Inject

class ConstruirResumenActivo @Inject constructor(
    private val localRepo: LocalRepository,
    private val contratoRepo: ContratoRepository,
    private val ventaRepo: VentaRepository,
    private val alertaRepo: AlertaRepository
) {
    operator fun invoke(activoId: String, referencia: LocalDate = LocalDate.now()): Flow<ResumenActivo> {
        val inicioMes = referencia.withDayOfMonth(1)
        val finMes = referencia.withDayOfMonth(referencia.lengthOfMonth())

        return combine(
            localRepo.observarPorActivo(activoId),
            contratoRepo.observarPorActivo(activoId),
            ventaRepo.sumaPorActivo(activoId, inicioMes, finMes),
            alertaRepo.observarPorActivo(activoId)
        ) { locales, contratos, ventasMes, alertas ->
            val activos = contratos.filter { lifecycle(it.fechaInicio, it.fechaTermino, referencia) != Lifecycle.VENCIDO }
            val ocupadosIds = activos.flatMap { it.localIds }.toSet()
            val totalArea = locales.sumOf { it.areaM2 }
            val areaOcupada = locales.filter { it.id in ocupadosIds }.sumOf { it.areaM2 }

            ResumenActivo(
                activoId = activoId,
                ocupacionPct = if (locales.isNotEmpty()) (ocupadosIds.size.toDouble() / locales.size) * 100 else 0.0,
                localesOcupados = ocupadosIds.size,
                localesVacantes = locales.size - ocupadosIds.size,
                localesTotal = locales.size,
                ventasMesActual = ventasMes,
                rentaMesActual = activos.sumOf { it.rentaFijaClp },
                promedioVentasPorM2 = if (areaOcupada > 0) FinanceMath.ventaPorM2(ventasMes, areaOcupada) else 0L,
                contratosFirmados = activos.count { it.signatureStatus == SignatureStatus.FIRMADO },
                contratosPendientesFirma = activos.count { it.signatureStatus != SignatureStatus.FIRMADO },
                alertasCriticas = alertas.count { it.tipo.name == "CRITICAL" },
                alertasWarning = alertas.count { it.tipo.name == "WARNING" }
            )
        }
    }

    companion object {
        fun lifecycle(inicio: LocalDate, termino: LocalDate, referencia: LocalDate): Lifecycle {
            return when {
                termino.isBefore(referencia) -> Lifecycle.VENCIDO
                inicio.isAfter(referencia) -> Lifecycle.BORRADOR
                java.time.temporal.ChronoUnit.DAYS.between(referencia, termino) <= 180 -> Lifecycle.POR_VENCER
                else -> Lifecycle.VIGENTE
            }
        }
    }

    @Suppress("unused")
    fun emptyResumen(activoId: String): Flow<ResumenActivo> = flowOf(
        ResumenActivo(activoId, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    )
}
