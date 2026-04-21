package cl.malliq.app.ui.scanner

import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import cl.malliq.app.ui.theme.AmbarSaturado
import cl.malliq.app.ui.theme.BackgroundNight
import cl.malliq.app.ui.theme.SurfaceOverlay
import cl.malliq.app.ui.theme.TextoSecundario
import cl.malliq.app.ui.theme.VerdePinoClaro
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import java.util.concurrent.Executors

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun EscanerScreen(onSalir: () -> Unit) {
    val permiso = rememberPermissionState(android.Manifest.permission.CAMERA)

    LaunchedEffect(Unit) {
        if (!permiso.status.isGranted) permiso.launchPermissionRequest()
    }

    Box(Modifier.fillMaxSize().background(BackgroundNight)) {
        if (permiso.status.isGranted) {
            CamaraConOverlay(onSalir = onSalir)
        } else {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center
            ) {
                Text(
                    "Se necesita acceso a la cámara",
                    color = Color.White,
                    style = MaterialTheme.typography.headlineMedium
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    "Para escanear boletas y recibos en tiempo real.",
                    color = TextoSecundario,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}

@Composable
private fun CamaraConOverlay(onSalir: () -> Unit) {
    val context = LocalContext.current
    val owner = LocalLifecycleOwner.current
    val executor = remember { Executors.newSingleThreadExecutor() }
    var resultado by remember { mutableStateOf<BoletaParseada?>(null) }
    var confianzaFrame by remember { mutableStateOf(0f) }
    var framesEstables by remember { mutableStateOf(0) }

    val progresoEstable by animateFloatAsState(
        targetValue = (framesEstables / 12f).coerceAtMost(1f),
        animationSpec = tween(200),
        label = "estable"
    )

    DisposableEffect(Unit) {
        onDispose { executor.shutdown() }
    }

    AndroidView(
        factory = { ctx ->
            val preview = PreviewView(ctx).apply {
                scaleType = PreviewView.ScaleType.FILL_CENTER
            }
            val futuro = ProcessCameraProvider.getInstance(ctx)
            futuro.addListener({
                val provider = futuro.get()
                val previewUseCase = Preview.Builder().build().also {
                    it.surfaceProvider = preview.surfaceProvider
                }
                val analysis = ImageAnalysis.Builder()
                    .setResolutionSelector(
                        ResolutionSelector.Builder()
                            .setResolutionStrategy(
                                ResolutionStrategy(Size(1280, 720), ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER)
                            )
                            .build()
                    )
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()
                analysis.setAnalyzer(executor, AnalizadorOcr { frame ->
                    confianzaFrame = frame.confianzaPromedio
                    if (frame.confianzaPromedio > 0.35f) {
                        framesEstables += 1
                        if (framesEstables >= 12 && resultado == null) {
                            resultado = BoletaParser.parsear(frame.texto)
                        }
                    } else {
                        framesEstables = 0
                    }
                })
                provider.unbindAll()
                provider.bindToLifecycle(owner, CameraSelector.DEFAULT_BACK_CAMERA, previewUseCase, analysis)
            }, ContextCompat.getMainExecutor(ctx))
            preview
        },
        modifier = Modifier.fillMaxSize()
    )

    OverlayEscaner(progreso = progresoEstable)

    IconButton(
        onClick = onSalir,
        modifier = Modifier.padding(start = 12.dp, top = 56.dp)
    ) {
        Icon(Icons.Rounded.Close, contentDescription = "Cerrar", tint = Color.White)
    }

    AnimatedVisibility(
        visible = resultado != null,
        enter = fadeIn(tween(200)),
        exit = fadeOut(tween(200))
    ) {
        resultado?.let { ResultadoBoleta(it, onDescartar = { resultado = null; framesEstables = 0 }) }
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 120.dp)
    ) {
        Text(
            if (progresoEstable < 1f) "Apunta al recibo" else "Capturando…",
            color = Color.White,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.height(4.dp))
        Text(
            "Mantén estable para detectar",
            color = TextoSecundario,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun OverlayEscaner(progreso: Float) {
    Canvas(Modifier.fillMaxSize()) {
        val margin = size.minDimension * 0.1f
        val rectW = size.width - margin * 2
        val rectH = rectW * 1.3f
        val topY = (size.height - rectH) / 2
        val cornerLen = 36.dp.toPx()
        val color = if (progreso >= 1f) VerdePinoClaro else AmbarSaturado
        val stroke = Stroke(width = 3.dp.toPx())

        drawRect(Color.Black.copy(alpha = 0.55f), size = size)
        drawRect(
            color = Color.Transparent,
            topLeft = Offset(margin, topY),
            size = androidx.compose.ui.geometry.Size(rectW, rectH),
            blendMode = androidx.compose.ui.graphics.BlendMode.Clear
        )

        val tl = Offset(margin, topY)
        val tr = Offset(margin + rectW, topY)
        val bl = Offset(margin, topY + rectH)
        val br = Offset(margin + rectW, topY + rectH)
        drawLine(color, tl, tl.copy(x = tl.x + cornerLen), strokeWidth = stroke.width)
        drawLine(color, tl, tl.copy(y = tl.y + cornerLen), strokeWidth = stroke.width)
        drawLine(color, tr, tr.copy(x = tr.x - cornerLen), strokeWidth = stroke.width)
        drawLine(color, tr, tr.copy(y = tr.y + cornerLen), strokeWidth = stroke.width)
        drawLine(color, bl, bl.copy(x = bl.x + cornerLen), strokeWidth = stroke.width)
        drawLine(color, bl, bl.copy(y = bl.y - cornerLen), strokeWidth = stroke.width)
        drawLine(color, br, br.copy(x = br.x - cornerLen), strokeWidth = stroke.width)
        drawLine(color, br, br.copy(y = br.y - cornerLen), strokeWidth = stroke.width)

        val lineaY = topY + rectH * progreso
        drawLine(
            color = AmbarSaturado.copy(alpha = 0.9f),
            start = Offset(margin, lineaY),
            end = Offset(margin + rectW, lineaY),
            strokeWidth = 1.5.dp.toPx()
        )
    }
}

@Composable
private fun ResultadoBoleta(parsed: BoletaParseada, onDescartar: () -> Unit) {
    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.85f)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .padding(24.dp)
                .background(SurfaceOverlay, RoundedCornerShape(24.dp))
                .padding(24.dp)
        ) {
            Text(
                "Boleta detectada",
                color = AmbarSaturado,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(Modifier.height(12.dp))
            FilaDato("RUT", parsed.rut ?: "—")
            FilaDato("Total", parsed.total?.let { "$" + "%,d".format(it) } ?: "—")
            FilaDato("Neto", parsed.neto?.let { "$" + "%,d".format(it) } ?: "—")
            FilaDato("Fecha", parsed.fecha?.toString() ?: "—")
            FilaDato("Ticket", parsed.numeroTicket ?: "—")
            Spacer(Modifier.height(12.dp))
            Text(
                "Confianza ${(parsed.confianza * 100).toInt()}%",
                color = TextoSecundario,
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(Modifier.height(18.dp))
            Text(
                "Toca fuera para escanear otra",
                color = TextoSecundario,
                style = MaterialTheme.typography.labelMedium
            )
        }
    }
}

@Composable
private fun FilaDato(etiqueta: String, valor: String) {
    androidx.compose.foundation.layout.Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
    ) {
        Text(etiqueta, color = TextoSecundario, modifier = Modifier.fillMaxWidth(0.4f))
        Text(valor, color = Color.White, style = cl.malliq.app.ui.theme.NumeroInline)
    }
}
