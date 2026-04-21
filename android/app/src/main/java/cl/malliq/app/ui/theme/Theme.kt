package cl.malliq.app.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val MallIqDarkScheme = darkColorScheme(
    primary = AmbarSaturado,
    onPrimary = BackgroundNight,
    primaryContainer = AmbarSuave.copy(alpha = 0.15f),
    onPrimaryContainer = AmbarSuave,
    secondary = VerdePino,
    onSecondary = TextoPrimario,
    secondaryContainer = VerdePino.copy(alpha = 0.2f),
    tertiary = AzulDato,
    background = BackgroundNight,
    onBackground = TextoPrimario,
    surface = SurfaceNight,
    onSurface = TextoPrimario,
    surfaceVariant = SurfaceElevated,
    onSurfaceVariant = TextoSecundario,
    error = RojoTerracota,
    onError = TextoPrimario,
    outline = BordeSutil,
    outlineVariant = TextoTerciario
)

@Composable
fun MallIqTheme(content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = BackgroundNight.toArgb()
            window.navigationBarColor = BackgroundNight.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = MallIqDarkScheme,
        typography = MallIqTypography,
        shapes = MallIqShapes,
        content = content
    )
}
