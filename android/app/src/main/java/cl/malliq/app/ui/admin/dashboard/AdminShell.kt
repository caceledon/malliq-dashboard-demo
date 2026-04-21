package cl.malliq.app.ui.admin.dashboard

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Business
import androidx.compose.material.icons.rounded.Dashboard
import androidx.compose.material.icons.rounded.DocumentScanner
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.People
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import cl.malliq.app.ui.admin.contratos.ContratosScreen
import cl.malliq.app.ui.admin.locatarios.LocatariosScreen
import cl.malliq.app.ui.navigation.MallIqDestination
import cl.malliq.app.ui.theme.AmbarSaturado
import cl.malliq.app.ui.theme.BackgroundNight
import cl.malliq.app.ui.theme.GradienteDashboard
import cl.malliq.app.ui.theme.SurfaceElevated
import cl.malliq.app.ui.theme.TextoSecundario

enum class AdminTab { DASHBOARD, LOCATARIOS, SCANNER, CONTRATOS, ALERTAS }

@Composable
fun AdminShell(navController: NavHostController) {
    var tab by remember { mutableStateOf(AdminTab.DASHBOARD) }

    Box(
        Modifier
            .fillMaxSize()
            .background(GradienteDashboard)
    ) {
        Box(Modifier.fillMaxSize().padding(bottom = 96.dp)) {
            AnimatedContent(
                targetState = tab,
                transitionSpec = {
                    (slideInVertically(tween(350)) { it / 8 } + fadeIn(tween(350)))
                        .togetherWith(slideOutVertically(tween(200)) { -it / 12 } + fadeOut(tween(150)))
                },
                label = "tab_switch"
            ) { actual ->
                when (actual) {
                    AdminTab.DASHBOARD -> DashboardScreen(
                        onAbrirContrato = { id -> navController.navigate(MallIqDestination.AdminContratoDetalle(id)) }
                    )
                    AdminTab.LOCATARIOS -> LocatariosScreen(
                        onAbrirContrato = { id -> navController.navigate(MallIqDestination.AdminContratoDetalle(id)) }
                    )
                    AdminTab.CONTRATOS -> ContratosScreen(
                        onAbrir = { id -> navController.navigate(MallIqDestination.AdminContratoDetalle(id)) }
                    )
                    AdminTab.ALERTAS -> AlertasPlaceholder()
                    AdminTab.SCANNER -> Unit
                }
            }
        }

        AdminBottomBar(
            actual = tab,
            onTab = { nueva ->
                if (nueva == AdminTab.SCANNER) {
                    navController.navigate(MallIqDestination.AdminScanner)
                } else tab = nueva
            },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .windowInsetsPadding(WindowInsets.navigationBars)
        )
    }
}

@Composable
private fun AdminBottomBar(
    actual: AdminTab,
    onTab: (AdminTab) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceEvenly,
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .shadow(24.dp, RoundedCornerShape(28.dp))
            .background(SurfaceElevated, RoundedCornerShape(28.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp)
    ) {
        BarItem(Icons.Rounded.Dashboard, "Resumen", actual == AdminTab.DASHBOARD) { onTab(AdminTab.DASHBOARD) }
        BarItem(Icons.Rounded.People, "Locatarios", actual == AdminTab.LOCATARIOS) { onTab(AdminTab.LOCATARIOS) }
        BarItemFab { onTab(AdminTab.SCANNER) }
        BarItem(Icons.Rounded.Business, "Contratos", actual == AdminTab.CONTRATOS) { onTab(AdminTab.CONTRATOS) }
        BarItem(Icons.Rounded.NotificationsActive, "Alertas", actual == AdminTab.ALERTAS) { onTab(AdminTab.ALERTAS) }
    }
}

@Composable
private fun BarItem(icon: ImageVector, label: String, seleccionado: Boolean, onClick: () -> Unit) {
    val interaction = remember { MutableInteractionSource() }
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .defaultMinSize(minWidth = 56.dp)
            .background(
                if (seleccionado) AmbarSaturado.copy(alpha = 0.14f) else Color.Transparent,
                RoundedCornerShape(14.dp)
            )
            .clickable(interactionSource = interaction, indication = null, onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = if (seleccionado) AmbarSaturado else TextoSecundario,
            modifier = Modifier.size(22.dp)
        )
        if (seleccionado) {
            Spacer(Modifier.height(4.dp))
            Text(
                label,
                color = AmbarSaturado,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
private fun BarItemFab(onClick: () -> Unit) {
    val interaction = remember { MutableInteractionSource() }
    Box(
        modifier = Modifier
            .size(60.dp)
            .shadow(20.dp, CircleShape)
            .background(AmbarSaturado, CircleShape)
            .clickable(interactionSource = interaction, indication = null, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            Icons.Rounded.DocumentScanner,
            contentDescription = "Escanear",
            tint = BackgroundNight,
            modifier = Modifier.size(28.dp)
        )
    }
}

@Composable
private fun AlertasPlaceholder() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("Bandeja de alertas", color = TextoSecundario)
    }
}
