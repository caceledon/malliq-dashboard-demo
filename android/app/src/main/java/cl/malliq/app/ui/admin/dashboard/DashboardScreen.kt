package cl.malliq.app.ui.admin.dashboard

import androidx.compose.animation.core.EaseOutCubic
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowDropDown
import androidx.compose.material.icons.rounded.AttachMoney
import androidx.compose.material.icons.rounded.HomeWork
import androidx.compose.material.icons.rounded.Receipt
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import cl.malliq.app.domain.model.ResumenActivo
import cl.malliq.app.ui.admin.switcher.ActivoSwitcher
import cl.malliq.app.ui.components.EstiloKpi
import cl.malliq.app.ui.components.TarjetaKpi
import cl.malliq.app.ui.theme.AmbarSaturado
import cl.malliq.app.ui.theme.AzulDato
import cl.malliq.app.ui.theme.GradientePassport
import cl.malliq.app.ui.theme.RojoTerracota
import cl.malliq.app.ui.theme.SurfaceOverlay
import cl.malliq.app.ui.theme.TextoSecundario
import cl.malliq.app.ui.theme.VerdePinoClaro
import cl.malliq.app.util.Formateo

@Composable
fun DashboardScreen(
    onAbrirContrato: (String) -> Unit,
    vm: DashboardViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsStateWithLifecycle()
    var switcherAbierto by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
            .padding(top = 56.dp, bottom = 24.dp)
    ) {
        EncabezadoActivo(
            nombre = state.activo?.nombre ?: "MallIQ",
            ciudad = state.activo?.ciudad ?: "—",
            alertas = state.alertasCount,
            onClick = { switcherAbierto = true }
        )
        Spacer(Modifier.height(20.dp))

        state.resumen?.let { resumen ->
            TarjetaOcupacion(resumen)
            Spacer(Modifier.height(12.dp))
            MosaicoKpis(resumen)
            Spacer(Modifier.height(16.dp))
            TarjetaVentasMes(resumen)
        }
    }

    ActivoSwitcher(
        activos = state.listaActivos,
        activoActivo = state.activo,
        visible = switcherAbierto,
        onDismiss = { switcherAbierto = false },
        onSeleccionar = { vm.seleccionarActivo(it.id) }
    )
}

@Composable
private fun EncabezadoActivo(nombre: String, ciudad: String, alertas: Int, onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.weight(1f).clickable(onClick = onClick)) {
            Text(
                ciudad.uppercase(),
                style = MaterialTheme.typography.labelMedium,
                color = TextoSecundario
            )
            Spacer(Modifier.height(2.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    nombre,
                    style = MaterialTheme.typography.headlineLarge,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold
                )
                Icon(
                    Icons.Rounded.ArrowDropDown,
                    contentDescription = null,
                    tint = TextoSecundario
                )
            }
        }
        if (alertas > 0) {
            Box(
                Modifier
                    .background(RojoTerracota.copy(alpha = 0.15f), RoundedCornerShape(100.dp))
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text(
                    "$alertas alertas",
                    color = RojoTerracota,
                    style = MaterialTheme.typography.labelMedium
                )
            }
        }
    }
}

@Composable
private fun TarjetaOcupacion(resumen: ResumenActivo) {
    val progress by animateFloatAsState(
        targetValue = (resumen.ocupacionPct / 100f).toFloat(),
        animationSpec = tween(1000, easing = EaseOutCubic),
        label = "ocupacion"
    )
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(220.dp)
            .background(GradientePassport, RoundedCornerShape(24.dp))
            .padding(20.dp)
    ) {
        Column(Modifier.fillMaxSize()) {
            Text(
                "OCUPACIÓN",
                style = MaterialTheme.typography.labelMedium,
                color = TextoSecundario
            )
            Spacer(Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    Formateo.porcentaje(resumen.ocupacionPct),
                    style = cl.malliq.app.ui.theme.NumeroHero,
                    color = Color.White
                )
                Spacer(Modifier.width(12.dp))
                Column(Modifier.padding(bottom = 6.dp)) {
                    Text("${resumen.localesOcupados} / ${resumen.localesTotal}", color = VerdePinoClaro, style = MaterialTheme.typography.labelLarge)
                    Text("${resumen.localesVacantes} vacantes", color = TextoSecundario, style = MaterialTheme.typography.labelMedium)
                }
            }
            Spacer(Modifier.weight(1f))
            CurvaOcupacion(progress)
        }
    }
}

@Composable
private fun CurvaOcupacion(progress: Float) {
    Canvas(
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
    ) {
        val w = size.width
        val h = size.height
        val path = Path().apply {
            moveTo(0f, h * 0.8f)
            cubicTo(w * 0.25f, h * 0.1f, w * 0.5f, h * 0.9f, w * 0.8f, h * 0.25f)
            lineTo(w, h * 0.45f)
        }
        drawPath(
            path,
            brush = Brush.horizontalGradient(listOf(AmbarSaturado, VerdePinoClaro)),
            style = Stroke(width = 2.5.dp.toPx())
        )
        val fill = Path().apply { addPath(path); lineTo(w * progress, h); lineTo(0f, h); close() }
        drawPath(
            fill,
            brush = Brush.verticalGradient(listOf(AmbarSaturado.copy(alpha = 0.25f), Color.Transparent))
        )
    }
}

@Composable
private fun MosaicoKpis(resumen: ResumenActivo) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            TarjetaKpi(
                titulo = "Rentas del mes",
                valor = Formateo.clpCompacto(resumen.rentaMesActual),
                sublinea = "${resumen.contratosFirmados} firmados",
                icono = Icons.Rounded.AttachMoney,
                acento = AmbarSaturado,
                modifier = Modifier.weight(1f)
            )
            TarjetaKpi(
                titulo = "Ventas mes",
                valor = Formateo.clpCompacto(resumen.ventasMesActual),
                sublinea = "${Formateo.clpCompacto(resumen.promedioVentasPorM2)}/m²",
                icono = Icons.Rounded.Receipt,
                acento = VerdePinoClaro,
                modifier = Modifier.weight(1f)
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            TarjetaKpi(
                titulo = "Locales activos",
                valor = resumen.localesOcupados.toString(),
                sublinea = "de ${resumen.localesTotal}",
                icono = Icons.Rounded.HomeWork,
                acento = AzulDato,
                modifier = Modifier.weight(1f)
            )
            TarjetaKpi(
                titulo = "Alertas",
                valor = (resumen.alertasCriticas + resumen.alertasWarning).toString(),
                sublinea = "${resumen.alertasCriticas} críticas",
                icono = Icons.Rounded.Warning,
                acento = RojoTerracota,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun TarjetaVentasMes(resumen: ResumenActivo) {
    TarjetaKpi(
        titulo = "Proyección del mes",
        valor = Formateo.clp(resumen.ventasMesActual),
        sublinea = "Costo de ocupación promedio",
        estilo = EstiloKpi.HERO,
        acento = AmbarSaturado,
        modifier = Modifier.fillMaxWidth()
    )
}
