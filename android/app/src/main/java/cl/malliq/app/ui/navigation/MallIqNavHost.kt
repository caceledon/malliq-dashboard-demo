package cl.malliq.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import cl.malliq.app.ui.admin.dashboard.AdminShell
import cl.malliq.app.ui.autofill.AutofillContratoScreen
import cl.malliq.app.ui.biometric.BiometricGate
import cl.malliq.app.ui.locatario.home.LocatarioHomeScreen
import cl.malliq.app.ui.locatario.ventas.ReporteVentasScreen
import cl.malliq.app.ui.scanner.EscanerScreen

@Composable
fun MallIqNavHost(
    startDestination: MallIqDestination,
    navController: NavHostController = rememberNavController()
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable<MallIqDestination.PortalSelector> {
            PortalSelector(
                onAdmin = { navController.navigate(MallIqDestination.Biometric) },
                onLocatario = { navController.navigate(MallIqDestination.LocatarioHome) }
            )
        }

        composable<MallIqDestination.Biometric> {
            BiometricGate(onAutorizado = {
                navController.navigate(MallIqDestination.AdminHome) {
                    popUpTo<MallIqDestination.PortalSelector> { inclusive = true }
                }
            })
        }

        composable<MallIqDestination.AdminHome> { AdminShell(navController = navController) }

        composable<MallIqDestination.AdminScanner> {
            EscanerScreen(onSalir = { navController.popBackStack() })
        }

        composable<MallIqDestination.AutofillContrato> {
            AutofillContratoScreen(onFinalizar = { navController.popBackStack() })
        }

        composable<MallIqDestination.LocatarioHome> {
            LocatarioHomeScreen(
                onReportar = { navController.navigate(MallIqDestination.LocatarioReporteVentas) },
                onVerContrato = { navController.navigate(MallIqDestination.LocatarioContrato) }
            )
        }

        composable<MallIqDestination.LocatarioReporteVentas> {
            ReporteVentasScreen(onCerrar = { navController.popBackStack() })
        }

        composable<MallIqDestination.LocatarioContrato> {
            cl.malliq.app.ui.locatario.home.ContratoLocatarioScreen(
                onSalir = { navController.popBackStack() }
            )
        }

        composable<MallIqDestination.AdminContratoDetalle> { entry ->
            val args = entry.toRoute<MallIqDestination.AdminContratoDetalle>()
            cl.malliq.app.ui.admin.contratos.ContratoDetalleScreen(
                contratoId = args.contratoId,
                onCerrar = { navController.popBackStack() }
            )
        }
    }
}
