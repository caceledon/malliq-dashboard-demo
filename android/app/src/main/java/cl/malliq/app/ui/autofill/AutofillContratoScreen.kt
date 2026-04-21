package cl.malliq.app.ui.autofill

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.EaseInOutQuad
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import cl.malliq.app.data.remote.api.AutofillCampo
import cl.malliq.app.ui.theme.AmbarSaturado
import cl.malliq.app.ui.theme.GradienteDashboard
import cl.malliq.app.ui.theme.GradientePassport
import cl.malliq.app.ui.theme.JetBrainsMono
import cl.malliq.app.ui.theme.NumeroInline
import cl.malliq.app.ui.theme.RojoTerracotaClaro
import cl.malliq.app.ui.theme.SurfaceOverlay
import cl.malliq.app.ui.theme.TextoSecundario
import cl.malliq.app.ui.theme.VerdePinoClaro

enum class FaseAutofill { PROCESANDO, REVISION }

@Composable
fun AutofillContratoScreen(onFinalizar: () -> Unit) {
    var fase by remember { mutableStateOf(FaseAutofill.PROCESANDO) }
    val campos = remember { mutableStateListOf<AutofillCampo>() }

    LaunchedEffect(Unit) {
        val demo = listOf(
            AutofillCampo("companyName", "Zara Chile S.A.", 0.92f, "RAZÓN SOCIAL: ZARA CHILE S.A."),
            AutofillCampo("storeName", "Zara Mujer", 0.88f, "LOCAL IDENTIFICADO COMO ZARA MUJER"),
            AutofillCampo("startDate", "2025-03-01", 0.95f, "FECHA INICIO: 01/03/2025"),
            AutofillCampo("endDate", "2030-02-28", 0.90f, "TÉRMINO: 28/02/2030"),
            AutofillCampo("baseRentUF", "1.25", 0.78f, "RENTA BASE: 1,25 UF/m²"),
            AutofillCampo("variableRentPct", "5.0", 0.65f, "PORCENTAJE VARIABLE: 5%"),
            AutofillCampo("garantiaMonto", "48000000", 0.55f, "GARANTÍA: $48.000.000"),
            AutofillCampo("garantiaVencimiento", "2026-03-01", 0.48f, "VIGENCIA GARANTÍA MAR 2026")
        )
        demo.forEach { campo ->
            kotlinx.coroutines.delay(320)
            campos.add(campo)
        }
        kotlinx.coroutines.delay(250)
        fase = FaseAutofill.REVISION
    }

    Box(Modifier.fillMaxSize().background(GradienteDashboard)) {
        IconButton(
            onClick = onFinalizar,
            modifier = Modifier.padding(start = 12.dp, top = 56.dp)
        ) {
            Icon(Icons.Rounded.Close, contentDescription = "Cerrar", tint = Color.White)
        }

        Column(Modifier.padding(top = 88.dp, bottom = 16.dp)) {
            Column(Modifier.padding(horizontal = 24.dp)) {
                Text("Autofill de contrato", color = TextoSecundario, style = MaterialTheme.typography.labelMedium)
                Spacer(Modifier.height(4.dp))
                Text(
                    if (fase == FaseAutofill.PROCESANDO) "Leyendo PDF…" else "Revisa y confirma",
                    style = MaterialTheme.typography.headlineLarge,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold
                )
            }
            Spacer(Modifier.height(20.dp))

            AnimatedVisibility(
                visible = fase == FaseAutofill.PROCESANDO,
                enter = fadeIn(tween(200)),
                exit = fadeOut(tween(200))
            ) { ThumbnailEscaneo() }

            LazyColumn(
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(campos, key = { it.clave }) { campo ->
                    AnimatedVisibility(
                        visible = true,
                        enter = fadeIn(tween(300)) + slideInVertically(tween(300)) { it / 3 }
                    ) {
                        CampoAutofill(campo)
                    }
                    Spacer(Modifier.height(10.dp))
                }
            }
        }
    }
}

@Composable
private fun ThumbnailEscaneo() {
    val transicion = rememberInfiniteTransition(label = "escaneo")
    val y by transicion.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1800, easing = EaseInOutQuad),
            repeatMode = RepeatMode.Reverse
        ),
        label = "barrido"
    )

    Box(
        modifier = Modifier
            .padding(horizontal = 24.dp)
            .fillMaxWidth()
            .height(180.dp)
            .background(GradientePassport, RoundedCornerShape(20.dp))
    ) {
        Canvas(Modifier.fillMaxSize().padding(16.dp)) {
            val barraY = size.height * y
            drawLine(
                brush = Brush.horizontalGradient(listOf(Color.Transparent, AmbarSaturado, Color.Transparent)),
                start = Offset(0f, barraY),
                end = Offset(size.width, barraY),
                strokeWidth = 2.dp.toPx()
            )
        }
        Text(
            "contrato_zara.pdf",
            color = TextoSecundario,
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier
                .padding(16.dp)
                .align(Alignment.BottomStart)
        )
    }
}

@Composable
private fun CampoAutofill(campo: AutofillCampo) {
    var valor by remember { mutableStateOf(TextFieldValue(campo.valor)) }
    var expandido by remember { mutableStateOf(false) }
    val color = when {
        campo.confianza >= 0.85f -> VerdePinoClaro
        campo.confianza >= 0.6f -> AmbarSaturado
        else -> RojoTerracotaClaro
    }

    Column(
        Modifier
            .fillMaxWidth()
            .background(GradientePassport, RoundedCornerShape(18.dp))
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                campo.clave.etiquetaLegible(),
                color = TextoSecundario,
                style = MaterialTheme.typography.labelMedium,
                modifier = Modifier.weight(1f)
            )
            Box(
                Modifier
                    .size(10.dp)
                    .background(color, CircleShape)
                    .clickable { expandido = !expandido }
            )
        }
        Spacer(Modifier.height(6.dp))
        BasicTextField(
            value = valor,
            onValueChange = { valor = it },
            textStyle = TextStyle(
                color = Color.White,
                fontFamily = JetBrainsMono,
                fontSize = 18.sp
            ),
            cursorBrush = Brush.verticalGradient(listOf(AmbarSaturado, AmbarSaturado)),
            modifier = Modifier.fillMaxWidth()
        )
        AnimatedVisibility(visible = expandido) {
            Column(Modifier.padding(top = 12.dp)) {
                Text("Fragmento original:", color = TextoSecundario, style = MaterialTheme.typography.labelMedium)
                Spacer(Modifier.height(4.dp))
                Text(
                    campo.fragmento,
                    color = AmbarSaturado,
                    style = NumeroInline,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceOverlay, RoundedCornerShape(10.dp))
                        .padding(10.dp)
                )
            }
        }
    }
}

private fun String.etiquetaLegible(): String = when (this) {
    "companyName" -> "Razón social"
    "storeName" -> "Nombre local"
    "startDate" -> "Inicio contrato"
    "endDate" -> "Término contrato"
    "baseRentUF" -> "Renta base UF/m²"
    "variableRentPct" -> "Renta variable %"
    "garantiaMonto" -> "Monto garantía"
    "garantiaVencimiento" -> "Vencimiento garantía"
    else -> replaceFirstChar { it.uppercase() }
}
