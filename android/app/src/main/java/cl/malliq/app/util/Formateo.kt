package cl.malliq.app.util

import java.text.NumberFormat
import java.time.format.DateTimeFormatter
import java.util.Locale

object Formateo {

    private val localeCl = Locale.forLanguageTag("es-CL")
    private val nfClp = NumberFormat.getCurrencyInstance(localeCl)
    private val nfNumber = NumberFormat.getNumberInstance(localeCl)
    private val fechaCorta = DateTimeFormatter.ofPattern("dd 'de' MMMM", localeCl)
    private val fechaISO = DateTimeFormatter.ofPattern("dd/MM/yyyy", localeCl)

    fun clp(valor: Long): String = nfClp.format(valor).replace("CLP", "$").trim()

    fun clpCompacto(valor: Long): String = when {
        valor >= 1_000_000_000 -> "$" + "%.1fB".format(valor / 1_000_000_000.0)
        valor >= 1_000_000 -> "$" + "%.1fM".format(valor / 1_000_000.0)
        valor >= 1_000 -> "$" + "%.0fK".format(valor / 1_000.0)
        else -> "$" + nfNumber.format(valor)
    }

    fun uf(valor: Double, decimales: Int = 2): String = "UF %,.${decimales}f".format(localeCl, valor)

    fun porcentaje(valor: Double, decimales: Int = 1): String = "%,.${decimales}f%%".format(localeCl, valor)

    fun m2(valor: Double): String = "%,.0f m²".format(localeCl, valor)

    fun fecha(date: java.time.LocalDate): String = date.format(fechaCorta)
    fun fechaISO(date: java.time.LocalDate): String = date.format(fechaISO)

    fun duranteEscribiendo(raw: String): String {
        val digits = raw.filter { it.isDigit() }
        if (digits.isEmpty()) return ""
        val value = digits.toLong()
        return "$" + nfNumber.format(value)
    }
}
