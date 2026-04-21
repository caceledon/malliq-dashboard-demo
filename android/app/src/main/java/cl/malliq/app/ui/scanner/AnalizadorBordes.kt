package cl.malliq.app.ui.scanner

import android.graphics.Bitmap
import android.graphics.ImageFormat
import android.media.Image
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.nio.ByteBuffer

data class FrameOcr(
    val texto: String,
    val confianzaPromedio: Float
)

class AnalizadorOcr(
    private val onResultado: (FrameOcr) -> Unit
) : ImageAnalysis.Analyzer {

    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    @ExperimentalGetImage
    override fun analyze(proxy: ImageProxy) {
        val media = proxy.image
        if (media == null) {
            proxy.close()
            return
        }
        val input = InputImage.fromMediaImage(media, proxy.imageInfo.rotationDegrees)
        recognizer.process(input)
            .addOnSuccessListener { result ->
                val texto = result.text
                val confianza = if (texto.isBlank()) 0f else (texto.length.coerceAtMost(400) / 400f)
                onResultado(FrameOcr(texto, confianza))
            }
            .addOnCompleteListener { proxy.close() }
    }
}

@Suppress("unused")
private fun Image.toBitmap(): Bitmap? {
    if (format != ImageFormat.YUV_420_888) return null
    val y = planes[0].buffer
    val u = planes[1].buffer
    val v = planes[2].buffer
    val ySize = y.remaining()
    val uSize = u.remaining()
    val vSize = v.remaining()
    val nv21 = ByteArray(ySize + uSize + vSize)
    y.get(nv21, 0, ySize)
    v.get(nv21, ySize, vSize)
    u.get(nv21, ySize + vSize, uSize)
    return null
}
