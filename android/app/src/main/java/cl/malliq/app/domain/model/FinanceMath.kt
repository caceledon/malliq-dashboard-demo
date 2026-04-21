package cl.malliq.app.domain.model

import java.time.LocalDate
import kotlin.math.roundToLong

object FinanceMath {

    fun rentaFijaDesdeUf(areaM2: Double, baseRentUfM2: Double, ufClp: Double): Long =
        (areaM2 * baseRentUfM2 * ufClp).roundToLong()

    fun rentaVariable(ventas: Long, porcentaje: Double): Long =
        (ventas * porcentaje / 100.0).roundToLong()

    fun costoOcupacionPct(rentaTotal: Long, gastosComunes: Long, fondoPromocion: Long, ventas: Long): Double {
        if (ventas <= 0) return 0.0
        return ((rentaTotal + gastosComunes + fondoPromocion).toDouble() / ventas) * 100.0
    }

    fun rentaBaseEfectivaUf(contrato: Contrato, referencia: LocalDate = LocalDate.now()): Double {
        val activo = contrato.escalonados.firstOrNull {
            !referencia.isBefore(it.fechaInicio) && !referencia.isAfter(it.fechaTermino)
        }
        return activo?.rentaFijaUfM2 ?: contrato.rentaBaseUfM2
    }

    fun rentaTotalMensual(contrato: Contrato, areaM2: Double, ventas: Long, ufClp: Double, referencia: LocalDate = LocalDate.now()): Long {
        val ufEfectiva = rentaBaseEfectivaUf(contrato, referencia)
        val fija = if (contrato.rentaBaseUfM2 > 0) rentaFijaDesdeUf(areaM2, ufEfectiva, ufClp) else contrato.rentaFijaClp
        val variable = rentaVariable(ventas, contrato.porcentajeVariable)
        return fija + variable
    }

    fun ventaPorM2(ventas: Long, areaM2: Double): Long =
        if (areaM2 > 0) (ventas / areaM2).roundToLong() else 0L
}
