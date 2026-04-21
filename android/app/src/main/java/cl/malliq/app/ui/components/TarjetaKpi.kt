package cl.malliq.app.ui.components

import androidx.compose.animation.core.EaseOutCubic
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import cl.malliq.app.ui.theme.AmbarSaturado
import cl.malliq.app.ui.theme.GradientePassport
import cl.malliq.app.ui.theme.NumeroHero
import cl.malliq.app.ui.theme.NumeroTabular
import cl.malliq.app.ui.theme.SurfaceOverlay
import cl.malliq.app.ui.theme.TextoSecundario

enum class EstiloKpi { HERO, COMPACTO }

@Composable
fun TarjetaKpi(
    titulo: String,
    valor: String,
    sublinea: String? = null,
    tendencia: Double? = null,
    icono: ImageVector? = null,
    acento: Color = AmbarSaturado,
    estilo: EstiloKpi = EstiloKpi.COMPACTO,
    modifier: Modifier = Modifier
) {
    val reveal = remember { mutableStateOf(0f) }
    val progress by animateFloatAsState(
        targetValue = 1f,
        animationSpec = tween(durationMillis = 800, easing = EaseOutCubic),
        label = "kpi_reveal"
    )
    reveal.value = progress

    Box(
        modifier = modifier
            .background(GradientePassport, RoundedCornerShape(22.dp))
            .border(1.dp, SurfaceOverlay, RoundedCornerShape(22.dp))
            .padding(PaddingValues(horizontal = 20.dp, vertical = 18.dp))
    ) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(8.dp)
                        .background(acento, CircleShape)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = titulo.uppercase(),
                    color = TextoSecundario,
                    style = androidx.compose.material3.MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Medium
                )
            }
            Spacer(Modifier.height(10.dp))
            Text(
                text = valor,
                style = if (estilo == EstiloKpi.HERO) NumeroHero else NumeroTabular,
                color = Color.White
            )
            if (sublinea != null || tendencia != null) {
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (tendencia != null) {
                        BadgeTendencia(tendencia)
                        Spacer(Modifier.width(8.dp))
                    }
                    if (sublinea != null) {
                        Text(
                            text = sublinea,
                            color = TextoSecundario,
                            style = androidx.compose.material3.MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }
        if (icono != null) {
            Icon(
                imageVector = icono,
                contentDescription = null,
                tint = acento.copy(alpha = 0.5f),
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .size(24.dp)
            )
        }
    }
}

@Composable
fun BadgeTendencia(delta: Double) {
    val (texto, color) = when {
        delta > 0.02 -> "▲ %+.1f%%".format(delta * 100) to cl.malliq.app.ui.theme.VerdePinoClaro
        delta < -0.02 -> "▼ %+.1f%%".format(delta * 100) to cl.malliq.app.ui.theme.RojoTerracotaClaro
        else -> "≈ estable" to TextoSecundario
    }
    Box(
        Modifier
            .background(color.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(
            text = texto,
            color = color,
            style = androidx.compose.material3.MaterialTheme.typography.labelMedium
        )
    }
}
