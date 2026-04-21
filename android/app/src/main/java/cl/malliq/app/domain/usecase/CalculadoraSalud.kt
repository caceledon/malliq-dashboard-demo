package cl.malliq.app.domain.usecase

import cl.malliq.app.data.local.entity.ContratoEntity
import cl.malliq.app.data.local.entity.VentaEntity
import cl.malliq.app.domain.model.FactorRiesgo
import cl.malliq.app.domain.model.SaludLocatario
import cl.malliq.app.domain.model.Tendencia
import cl.malliq.app.domain.repository.ContratoRepository
import cl.malliq.app.domain.repository.VentaRepository
import kotlinx.coroutines.flow.first
import java.time.LocalDate
import javax.inject.Inject
import kotlin.math.sqrt

class CalculadoraSalud @Inject constructor(
    private val contratoRepo: ContratoRepository,
    private val ventaRepo: VentaRepository
) {
    suspend operator fun invoke(locatarioId: String, referencia: LocalDate = LocalDate.now()): SaludLocatario {
        val contratos = contratoRepo.observarPorLocatario(locatarioId).first()
        val contratoVigente = contratos.firstOrNull { c ->
            !referencia.isBefore(c.fechaInicio) && !referencia.isAfter(c.fechaTermino)
        } ?: return SaludLocatario(50, Tendencia.ESTABLE, emptyList(), 0.25f)

        val inicio = referencia.minusMonths(12).withDayOfMonth(1)
        val ventas = ventaRepo.observarPorRango(contratoVigente.activoId, inicio, referencia).first()
            .filter { it.contratoId == contratoVigente.id }

        val ventasMensuales = ventas.groupBy { it.ocurridoEn.withDayOfMonth(1) }
            .mapValues { (_, v) -> v.sumOf { it.montoBruto } }
            .toSortedMap()

        val montos = ventasMensuales.values.toList()
        val promedio = if (montos.isNotEmpty()) montos.average() else 0.0
        val desviacion = if (montos.size > 1) sqrt(montos.sumOf { (it - promedio) * (it - promedio) } / montos.size) else 0.0
        val varianzaRel = if (promedio > 0) (desviacion / promedio).coerceAtMost(2.0) else 1.0

        val ratioVentaRenta = if (contratoVigente.rentaFijaClp > 0) {
            (montos.lastOrNull() ?: 0L).toDouble() / contratoVigente.rentaFijaClp
        } else 1.0

        val puntualidad = calcularPuntualidad(contratoVigente)
        val reportaATiempo = puntualidadReporte(ventas, referencia)

        val puntaje = (
            puntualidad * 35 +
            (1.0 - varianzaRel / 2.0) * 20 +
            (ratioVentaRenta.coerceAtMost(10.0) / 10.0) * 25 +
            reportaATiempo * 20
        ).coerceIn(0.0, 100.0).toInt()

        val tendencia = deducirTendencia(montos)
        val factores = detectarFactores(
            varianzaRel = varianzaRel,
            ratioVentaRenta = ratioVentaRenta,
            puntualidad = puntualidad,
            reportaATiempo = reportaATiempo
        )

        val probDefault = ((100 - puntaje) / 100f) * (1f + varianzaRel.toFloat() * 0.15f)

        return SaludLocatario(
            puntaje = puntaje,
            tendencia = tendencia,
            factoresRiesgo = factores,
            probabilidadDefault90d = probDefault.coerceIn(0f, 1f)
        )
    }

    private fun calcularPuntualidad(contrato: ContratoEntity): Double =
        listOf(
            contrato.healthPagoAlDia,
            contrato.healthEntregaVentas,
            contrato.healthNivelVenta,
            contrato.healthNivelRenta,
            contrato.healthPercepcionAdmin
        ).count { it } / 5.0

    private fun puntualidadReporte(ventas: List<VentaEntity>, referencia: LocalDate): Double {
        if (ventas.isEmpty()) return 0.5
        val aTiempo = ventas.count { venta ->
            val diasDiferencia = java.time.temporal.ChronoUnit.DAYS.between(venta.ocurridoEn, venta.importadoEn.atZone(java.time.ZoneId.systemDefault()).toLocalDate())
            diasDiferencia in 0..5
        }
        return aTiempo.toDouble() / ventas.size
    }

    private fun deducirTendencia(montos: List<Long>): Tendencia {
        if (montos.size < 3) return Tendencia.ESTABLE
        val tercio = montos.size / 3
        val inicio = montos.take(tercio).average()
        val fin = montos.takeLast(tercio).average()
        val delta = (fin - inicio) / (inicio.coerceAtLeast(1.0))
        return when {
            delta > 0.08 -> Tendencia.SUBIENDO
            delta < -0.08 -> Tendencia.BAJANDO
            else -> Tendencia.ESTABLE
        }
    }

    private fun detectarFactores(
        varianzaRel: Double,
        ratioVentaRenta: Double,
        puntualidad: Double,
        reportaATiempo: Double
    ): List<FactorRiesgo> = buildList {
        if (varianzaRel > 0.6) add(FactorRiesgo("varianza_alta", "Ventas muy irregulares mes a mes", 0.25f))
        if (ratioVentaRenta < 5.0) add(FactorRiesgo("ratio_bajo", "Ventas cubren poco la renta fija", 0.35f))
        if (puntualidad < 0.6) add(FactorRiesgo("pagos_atrasados", "Historial de pagos con atraso", 0.2f))
        if (reportaATiempo < 0.5) add(FactorRiesgo("sin_reportes", "Pocos reportes de ventas a tiempo", 0.2f))
    }
}
