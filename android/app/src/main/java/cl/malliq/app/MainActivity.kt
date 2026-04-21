package cl.malliq.app

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.fragment.app.FragmentActivity
import cl.malliq.app.data.preferences.SyncPreferences
import cl.malliq.app.ui.navigation.MallIqDestination
import cl.malliq.app.ui.navigation.MallIqNavHost
import cl.malliq.app.ui.theme.MallIqTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : FragmentActivity() {

    @Inject lateinit var prefs: SyncPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            MallIqTheme {
                val portal by prefs.portalFlow.collectAsState(initial = "selector")
                val start = when (portal) {
                    "admin" -> MallIqDestination.AdminHome
                    "locatario" -> MallIqDestination.LocatarioHome
                    else -> MallIqDestination.PortalSelector
                }
                MallIqNavHost(startDestination = start)
            }
        }
    }
}
