package cl.malliq.app.ui.admin.contratos

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import cl.malliq.app.ui.theme.GradienteDashboard
import cl.malliq.app.ui.theme.TextoSecundario

@Composable
fun ContratoDetalleScreen(
    contratoId: String,
    onCerrar: () -> Unit
) {
    Box(
        Modifier
            .fillMaxSize()
            .background(GradienteDashboard)
            .padding(24.dp)
            .padding(top = 56.dp)
    ) {
        Column {
            Text("Contrato", color = TextoSecundario, style = MaterialTheme.typography.labelMedium)
            Spacer(Modifier.height(2.dp))
            Text(
                contratoId,
                style = MaterialTheme.typography.headlineLarge,
                color = Color.White,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}
