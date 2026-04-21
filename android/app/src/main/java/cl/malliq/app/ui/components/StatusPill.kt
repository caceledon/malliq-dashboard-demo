package cl.malliq.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import cl.malliq.app.data.local.entity.Lifecycle
import cl.malliq.app.ui.theme.AmbarSaturado
import cl.malliq.app.ui.theme.RojoTerracota
import cl.malliq.app.ui.theme.TextoSecundario
import cl.malliq.app.ui.theme.VerdePinoClaro

@Composable
fun StatusPill(lifecycle: Lifecycle, modifier: Modifier = Modifier) {
    val (texto, color) = when (lifecycle) {
        Lifecycle.VIGENTE -> "Vigente" to VerdePinoClaro
        Lifecycle.POR_VENCER -> "Por vencer" to AmbarSaturado
        Lifecycle.VENCIDO -> "Vencido" to RojoTerracota
        Lifecycle.EN_FIRMA -> "En firma" to AmbarSaturado
        Lifecycle.BORRADOR -> "Borrador" to TextoSecundario
    }
    PillGenerica(texto = texto, color = color, modifier = modifier)
}

@Composable
fun PillGenerica(texto: String, color: Color, modifier: Modifier = Modifier) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .background(color.copy(alpha = 0.12f), RoundedCornerShape(100.dp))
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Box(Modifier.size(6.dp).background(color, CircleShape))
        Spacer(Modifier.width(8.dp))
        Text(
            text = texto,
            color = color,
            style = MaterialTheme.typography.labelMedium
        )
    }
}
