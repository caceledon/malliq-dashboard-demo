package cl.malliq.app.ui.locatario.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import cl.malliq.app.data.local.entity.Lifecycle
import cl.malliq.app.ui.components.StatusPill
import cl.malliq.app.ui.theme.AmbarSaturado
import cl.malliq.app.ui.theme.BackgroundNight
import cl.malliq.app.ui.theme.GradienteDashboard
import cl.malliq.app.ui.theme.GradientePassport
import cl.malliq.app.ui.theme.TextoSecundario
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun LocatarioHomeScreen(
    onReportar: () -> Unit,
    onVerContrato: () -> Unit
) {
    val hoy = LocalDate.now()
    val localeCl = Locale.forLanguageTag("es-CL")
    val diaSemana = hoy.dayOfWeek
        .getDisplayName(java.time.format.TextStyle.FULL, localeCl)
        .replaceFirstChar { it.uppercase() }
    val dia = hoy.format(DateTimeFormatter.ofPattern("d 'de' MMMM", localeCl))

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(GradienteDashboard)
            .padding(horizontal = 24.dp)
            .padding(top = 80.dp, bottom = 32.dp)
    ) {
        Text(diaSemana, style = MaterialTheme.typography.labelLarge, color = TextoSecundario)
        Text(
            dia,
            style = MaterialTheme.typography.displayMedium,
            color = Color.White,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(40.dp))

        BotonReportar(onClick = onReportar)

        Spacer(Modifier.height(24.dp))

        TarjetaSecundaria(
            titulo = "Mi contrato",
            bajada = "Renta, fechas clave y escalonados",
            pillContent = { StatusPill(lifecycle = Lifecycle.VIGENTE) },
            onClick = onVerContrato
        )
        Spacer(Modifier.height(12.dp))
        TarjetaSecundaria(
            titulo = "Histórico de ventas",
            bajada = "Revisa lo reportado en los últimos meses",
            pillContent = null,
            onClick = {}
        )
    }
}

@Composable
private fun BotonReportar(onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .height(108.dp)
            .background(AmbarSaturado, RoundedCornerShape(22.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 24.dp)
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                "Reportar Ventas del Día",
                style = MaterialTheme.typography.titleLarge,
                color = BackgroundNight,
                fontWeight = FontWeight.Bold
            )
            Text(
                "Tres taps y listo",
                style = MaterialTheme.typography.bodyMedium,
                color = BackgroundNight.copy(alpha = 0.65f)
            )
        }
        Icon(Icons.Rounded.ChevronRight, contentDescription = null, tint = BackgroundNight)
    }
}

@Composable
private fun TarjetaSecundaria(
    titulo: String,
    bajada: String,
    pillContent: (@Composable () -> Unit)?,
    onClick: () -> Unit
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .background(GradientePassport, RoundedCornerShape(20.dp))
            .clickable(onClick = onClick)
            .padding(20.dp)
    ) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    titulo,
                    style = MaterialTheme.typography.titleLarge,
                    color = Color.White
                )
                Spacer(Modifier.width(10.dp))
                pillContent?.invoke()
            }
            Spacer(Modifier.height(4.dp))
            Text(bajada, color = TextoSecundario, style = MaterialTheme.typography.bodyMedium)
        }
        Icon(Icons.Rounded.ChevronRight, contentDescription = null, tint = TextoSecundario)
    }
}
