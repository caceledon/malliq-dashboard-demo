package cl.malliq.app.ui.locatario.ventas

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Backspace
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import cl.malliq.app.ui.theme.AmbarSaturado
import cl.malliq.app.ui.theme.BackgroundNight
import cl.malliq.app.ui.theme.GradienteDashboard
import cl.malliq.app.ui.theme.JetBrainsMono
import cl.malliq.app.ui.theme.SurfaceElevated
import cl.malliq.app.ui.theme.TextoSecundario
import cl.malliq.app.ui.theme.VerdePino
import cl.malliq.app.util.Formateo

@Composable
fun ReporteVentasScreen(
    onCerrar: () -> Unit,
    vm: ReporteVentasViewModel = hiltViewModel()
) {
    val state by vm.state.collectAsStateWithLifecycle()

    LaunchedEffect(state.exito) {
        if (state.exito) {
            kotlinx.coroutines.delay(1200)
            onCerrar()
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(GradienteDashboard)
    ) {
        IconButton(
            onClick = onCerrar,
            modifier = Modifier.padding(start = 12.dp, top = 56.dp)
        ) {
            Icon(Icons.Rounded.Close, contentDescription = "Cancelar", tint = Color.White)
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 96.dp, bottom = 32.dp)
        ) {
            Column(Modifier.padding(horizontal = 32.dp)) {
                Text(
                    "Ventas de hoy",
                    style = MaterialTheme.typography.labelMedium,
                    color = TextoSecundario
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = if (state.raw.isEmpty()) "$ 0" else Formateo.duranteEscribiendo(state.raw),
                    fontFamily = JetBrainsMono,
                    fontWeight = FontWeight.Bold,
                    color = if (state.raw.isEmpty()) TextoSecundario else Color.White,
                    fontSize = 56.sp,
                    maxLines = 1
                )
            }

            Spacer(Modifier.weight(1f))

            Keypad(
                onTecla = { vm.escribir(it) },
                modifier = Modifier.padding(horizontal = 20.dp)
            )

            Spacer(Modifier.height(24.dp))

            BotonConfirmar(
                habilitado = vm.monto > 0 && !state.enviando,
                enviando = state.enviando,
                exito = state.exito,
                onClick = { vm.confirmar() },
                modifier = Modifier.padding(horizontal = 24.dp)
            )
        }

        AnimatedVisibility(
            visible = state.exito,
            enter = fadeIn(tween(200)),
            exit = fadeOut(tween(200)),
            modifier = Modifier.align(Alignment.Center)
        ) {
            Box(
                Modifier
                    .size(120.dp)
                    .background(VerdePino, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Rounded.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(60.dp))
            }
        }
    }
}

@Composable
private fun Keypad(onTecla: (String) -> Unit, modifier: Modifier = Modifier) {
    val haptics = LocalHapticFeedback.current
    val teclas = listOf(
        listOf("1", "2", "3"),
        listOf("4", "5", "6"),
        listOf("7", "8", "9"),
        listOf("000", "0", "⌫")
    )

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        teclas.forEach { fila ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                fila.forEach { tecla ->
                    TeclaNumerica(
                        tecla = tecla,
                        onClick = {
                            haptics.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.TextHandleMove)
                            onTecla(tecla)
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
private fun TeclaNumerica(tecla: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val interaction = remember { MutableInteractionSource() }
    Box(
        modifier = modifier
            .height(64.dp)
            .background(SurfaceElevated, RoundedCornerShape(20.dp))
            .clickable(interactionSource = interaction, indication = null, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        if (tecla == "⌫") {
            Icon(Icons.Rounded.Backspace, contentDescription = "Borrar", tint = Color.White)
        } else {
            Text(
                tecla,
                fontFamily = JetBrainsMono,
                fontWeight = FontWeight.Medium,
                fontSize = 26.sp,
                color = Color.White
            )
        }
    }
}

@Composable
private fun BotonConfirmar(
    habilitado: Boolean,
    enviando: Boolean,
    exito: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val fondo = if (habilitado) AmbarSaturado else SurfaceElevated
    val onFondo = if (habilitado) BackgroundNight else TextoSecundario
    Row(
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .fillMaxWidth()
            .height(64.dp)
            .background(fondo, RoundedCornerShape(22.dp))
            .clickable(enabled = habilitado, onClick = onClick)
    ) {
        when {
            enviando -> CircularProgressIndicator(color = BackgroundNight, modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
            exito -> Text("Enviado", color = BackgroundNight, fontWeight = FontWeight.Bold)
            else -> Text(
                "Confirmar reporte",
                color = onFondo,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
