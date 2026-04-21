package cl.malliq.app.ui.admin.switcher

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import cl.malliq.app.data.local.entity.ActivoEntity
import cl.malliq.app.ui.components.PillGenerica
import cl.malliq.app.ui.theme.AmbarSaturado
import cl.malliq.app.ui.theme.GradientePassport
import cl.malliq.app.ui.theme.SurfaceElevated
import cl.malliq.app.ui.theme.SurfaceOverlay
import cl.malliq.app.ui.theme.TextoSecundario
import cl.malliq.app.ui.theme.VerdePinoClaro
import cl.malliq.app.util.Formateo

@Composable
fun ActivoSwitcher(
    activos: List<ActivoEntity>,
    activoActivo: ActivoEntity?,
    visible: Boolean,
    onDismiss: () -> Unit,
    onSeleccionar: (ActivoEntity) -> Unit
) {
    if (!visible) return

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val initialIndex = remember(activoActivo, activos) {
        activos.indexOfFirst { it.id == activoActivo?.id }.coerceAtLeast(0)
    }
    val listState = rememberLazyListState(initialFirstVisibleItemIndex = initialIndex)
    val flingBehavior = rememberSnapFlingBehavior(listState)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SurfaceElevated,
        dragHandle = {
            Box(
                Modifier
                    .padding(vertical = 12.dp)
                    .size(width = 44.dp, height = 4.dp)
                    .background(SurfaceOverlay, RoundedCornerShape(100.dp))
            )
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 32.dp)
        ) {
            Column(Modifier.padding(horizontal = 24.dp)) {
                Text(
                    "Cambiar de Activo",
                    style = MaterialTheme.typography.labelMedium,
                    color = TextoSecundario
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "Desliza para elegir",
                    style = MaterialTheme.typography.headlineMedium,
                    color = androidx.compose.ui.graphics.Color.White,
                    fontWeight = FontWeight.SemiBold
                )
            }
            Spacer(Modifier.height(20.dp))
            LazyRow(
                state = listState,
                flingBehavior = flingBehavior,
                contentPadding = PaddingValues(horizontal = 48.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(280.dp)
            ) {
                itemsIndexed(activos, key = { _, a -> a.id }) { index, activo ->
                    val visibleIndex = listState.firstVisibleItemIndex
                    val foco = visibleIndex == index
                    val escala by animateFloatAsState(
                        targetValue = if (foco) 1f else 0.92f,
                        animationSpec = spring(dampingRatio = 0.7f, stiffness = 300f),
                        label = "escala_activo"
                    )
                    TarjetaActivoPassport(
                        activo = activo,
                        focoAcento = foco,
                        modifier = Modifier
                            .width(280.dp)
                            .graphicsLayer { scaleX = escala; scaleY = escala }
                            .clickable {
                                onSeleccionar(activo)
                                onDismiss()
                            }
                    )
                }
            }
        }
    }
}

@Composable
private fun TarjetaActivoPassport(
    activo: ActivoEntity,
    focoAcento: Boolean,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .background(GradientePassport, RoundedCornerShape(24.dp))
            .padding(20.dp)
    ) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(10.dp)
                        .background(
                            if (focoAcento) AmbarSaturado else TextoSecundario,
                            CircleShape
                        )
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = activo.ciudad.uppercase(),
                    color = TextoSecundario,
                    style = MaterialTheme.typography.labelMedium
                )
            }
            Spacer(Modifier.height(12.dp))
            Text(
                text = activo.nombre,
                style = MaterialTheme.typography.headlineLarge,
                color = androidx.compose.ui.graphics.Color.White,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(Modifier.height(16.dp))
            Row {
                LabelStat("GLA", Formateo.m2(activo.gla))
                Spacer(Modifier.width(16.dp))
                LabelStat("UF", "%,.0f".format(activo.ufActual))
            }
            Spacer(Modifier.height(16.dp))
            PillGenerica(
                texto = "Sync activo",
                color = VerdePinoClaro
            )
        }
    }
}

@Composable
private fun LabelStat(label: String, valor: String) {
    Column {
        Text(label, color = TextoSecundario, style = MaterialTheme.typography.labelMedium)
        Spacer(Modifier.height(4.dp))
        Text(
            valor,
            style = cl.malliq.app.ui.theme.NumeroTabular,
            color = androidx.compose.ui.graphics.Color.White
        )
    }
}
