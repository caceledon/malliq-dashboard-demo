package cl.malliq.app.ui.navigation

import kotlinx.serialization.Serializable

sealed interface MallIqDestination {
    @Serializable data object PortalSelector : MallIqDestination

    @Serializable data object AdminHome : MallIqDestination
    @Serializable data object AdminDashboard : MallIqDestination
    @Serializable data object AdminLocatarios : MallIqDestination
    @Serializable data object AdminContratos : MallIqDestination
    @Serializable data class AdminContratoDetalle(val contratoId: String) : MallIqDestination
    @Serializable data object AdminAlertas : MallIqDestination
    @Serializable data object AdminScanner : MallIqDestination

    @Serializable data object LocatarioHome : MallIqDestination
    @Serializable data object LocatarioReporteVentas : MallIqDestination
    @Serializable data object LocatarioContrato : MallIqDestination

    @Serializable data object AutofillContrato : MallIqDestination
    @Serializable data object Biometric : MallIqDestination
}
