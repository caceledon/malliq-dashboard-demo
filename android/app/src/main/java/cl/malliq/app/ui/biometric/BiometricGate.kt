package cl.malliq.app.ui.biometric

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Fingerprint
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import cl.malliq.app.ui.theme.AmbarSaturado
import cl.malliq.app.ui.theme.BackgroundNight
import cl.malliq.app.ui.theme.GradienteDashboard
import cl.malliq.app.ui.theme.TextoSecundario
import java.util.concurrent.Executors

@Composable
fun BiometricGate(onAutorizado: () -> Unit) {
    val context = LocalContext.current
    var error by remember { mutableStateOf<String?>(null) }
    var reintentar by remember { mutableStateOf(0) }

    LaunchedEffect(reintentar) {
        val activity = context as? FragmentActivity ?: return@LaunchedEffect
        val manager = BiometricManager.from(context)
        val status = manager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
        )

        if (status != BiometricManager.BIOMETRIC_SUCCESS) {
            error = "Biometría no disponible"
            onAutorizado()
            return@LaunchedEffect
        }

        val prompt = BiometricPrompt(
            activity,
            Executors.newSingleThreadExecutor(),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    activity.runOnUiThread { onAutorizado() }
                }
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    error = errString.toString()
                }
            }
        )

        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Acceso seguro")
            .setSubtitle("Confirma tu identidad para ingresar a MallIQ")
            .setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG or
                    BiometricManager.Authenticators.DEVICE_CREDENTIAL
            )
            .build()
        prompt.authenticate(info)
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(GradienteDashboard)
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                Icons.Rounded.Fingerprint,
                contentDescription = null,
                tint = AmbarSaturado,
                modifier = Modifier.size(80.dp)
            )
            Spacer(Modifier.height(24.dp))
            Text(
                "Acceso restringido",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Este portafolio contiene datos financieros sensibles. Autentícate para continuar.",
                color = TextoSecundario,
                style = MaterialTheme.typography.bodyMedium
            )
            error?.let {
                Spacer(Modifier.height(20.dp))
                Text(
                    it,
                    color = cl.malliq.app.ui.theme.RojoTerracota,
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    "Tocar para reintentar",
                    color = AmbarSaturado,
                    modifier = Modifier
                        .background(AmbarSaturado.copy(alpha = 0.12f), RoundedCornerShape(12.dp))
                        .clickable { error = null; reintentar++ }
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                )
            }
        }
    }
}
