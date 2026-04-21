package cl.malliq.app.ui.scanner

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeFormatterBuilder
import java.time.format.DateTimeParseException
import java.util.Locale

data class BoletaParseada(
    val rut: String?,
    val fecha: LocalDate?,
    val neto: Long?,
    val iva: Long?,
    val total: Long?,
    val numeroTicket: String?,
    val confianza: Float
)

object BoletaParser {

    private val rutRegex = Regex("""(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])""")
    private val totalRegex = Regex("""(?i)total[^\d]{0,10}\$?\s*([\d\.]{3,})""")
    private val netoRegex = Regex("""(?i)neto[^\d]{0,10}\$?\s*([\d\.]{3,})""")
    private val ivaRegex = Regex("""(?i)iva[^\d]{0,10}\$?\s*([\d\.]{3,})""")
    private val ticketRegex = Regex("""(?i)(?:n°|nro|boleta|folio)[^\d]{0,6}(\d{3,})""")
    private val fechaFormatos = listOf(
        DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale.forLanguageTag("es-CL")),
        DateTimeFormatter.ofPattern("dd-MM-yyyy", Locale.forLanguageTag("es-CL")),
        DateTimeFormatter.ofPattern("yyyy-MM-dd", Locale.forLanguageTag("es-CL"))
    )
    private val fechaRegex = Regex("""(\d{2}[/-]\d{2}[/-]\d{4})|(\d{4}-\d{2}-\d{2})""")

    fun parsear(texto: String): BoletaParseada {
        val rut = rutRegex.find(texto)?.value
        val total = totalRegex.find(texto)?.groupValues?.getOrNull(1)?.toLongOrNull()
        val totalCompleto = total ?: totalRegex.findAll(texto)
            .mapNotNull { it.groupValues[1].replace(".", "").toLongOrNull() }
            .maxOrNull()
        val neto = netoRegex.find(texto)?.groupValues?.getOrNull(1)?.replace(".", "")?.toLongOrNull()
        val iva = ivaRegex.find(texto)?.groupValues?.getOrNull(1)?.replace(".", "")?.toLongOrNull()
        val ticket = ticketRegex.find(texto)?.groupValues?.getOrNull(1)
        val fecha = fechaRegex.find(texto)?.value?.let(::tryParseFecha)

        val presentes = listOf(rut, totalCompleto, fecha, neto, iva, ticket).count { it != null }
        val confianza = (presentes / 6f).coerceIn(0f, 1f)

        return BoletaParseada(
            rut = rut,
            fecha = fecha,
            neto = neto,
            iva = iva,
            total = totalCompleto,
            numeroTicket = ticket,
            confianza = confianza
        )
    }

    private fun tryParseFecha(raw: String): LocalDate? {
        fechaFormatos.forEach { fmt ->
            try { return LocalDate.parse(raw, fmt) } catch (_: DateTimeParseException) {}
        }
        return null
    }
}
