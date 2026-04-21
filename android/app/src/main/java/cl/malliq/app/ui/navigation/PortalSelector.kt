package cl.malliq.app.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import cl.malliq.app.ui.theme.AmbarSaturado
import cl.malliq.app.ui.theme.BackgroundNight
import cl.malliq.app.ui.theme.GradienteDashboard
import cl.malliq.app.ui.theme.GradientePassport
import cl.malliq.app.ui.theme.SurfaceElevated
import cl.malliq.app.ui.theme.SurfaceOverlay
import cl.malliq.app.ui.theme.TextoSecundario
import cl.malliq.app.ui.theme.VerdePino

@Composable
fun PortalSelector(
    onAdmin: () -> Unit,
    onLocatario: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(GradienteDashboard)
            .padding(horizontal = 24.dp)
    ) {
        Column(
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .fillMaxSize()
                .padding(vertical = 48.dp)
        ) {
            Text(
                text = "MallIQ",
                style = MaterialTheme.typography.displayLarge,
                color = AmbarSaturado,
                fontWeight = FontWeight.Black
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = "Sistema operativo para la retail real estate",
                style = MaterialTheme.typography.bodyLarge,
                color = TextoSecundario
            )
            Spacer(Modifier.height(48.dp))

            PortalCard(
                titulo = "Administrador",
                bajada = "Portafolio, contratos, alertas y analítica financiera.",
                acento = AmbarSaturado,
                onClick = onAdmin
            )
            Spacer(Modifier.height(16.dp))
            PortalCard(
                titulo = "Locatario",
                bajada = "Reporta tus ventas y consulta tu contrato en segundos.",
                acento = VerdePino,
                onClick = onLocatario
            )
        }
    }
}

@Composable
private fun PortalCard(
    titulo: String,
    bajada: String,
    acento: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(156.dp)
            .background(GradientePassport, RoundedCornerShape(24.dp))
            .clickable(onClick = onClick)
            .padding(24.dp)
    ) {
        Box(
            Modifier
                .align(Alignment.TopStart)
                .background(acento, RoundedCornerShape(100.dp))
                .padding(horizontal = 10.dp, vertical = 4.dp)
        ) {
            Text(
                text = "Acceder",
                color = BackgroundNight,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold
            )
        }
        Column(Modifier.align(Alignment.BottomStart)) {
            Text(
                text = titulo,
                style = MaterialTheme.typography.headlineMedium,
                color = androidx.compose.ui.graphics.Color.White
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = bajada,
                style = MaterialTheme.typography.bodyMedium,
                color = TextoSecundario
            )
        }
    }
}
