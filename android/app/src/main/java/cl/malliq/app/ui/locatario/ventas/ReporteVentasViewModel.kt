package cl.malliq.app.ui.locatario.ventas

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import cl.malliq.app.data.local.entity.SaleSource
import cl.malliq.app.data.local.entity.SyncState
import cl.malliq.app.data.local.entity.VentaEntity
import cl.malliq.app.data.preferences.SyncPreferences
import cl.malliq.app.domain.repository.VentaRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject

data class ReporteVentasState(
    val raw: String = "",
    val enviando: Boolean = false,
    val exito: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ReporteVentasViewModel @Inject constructor(
    private val prefs: SyncPreferences,
    private val repo: VentaRepository
) : ViewModel() {

    private val _state = MutableStateFlow(ReporteVentasState())
    val state: StateFlow<ReporteVentasState> = _state.asStateFlow()

    fun escribir(tecla: String) {
        val actual = _state.value.raw
        val nuevo = when (tecla) {
            "⌫" -> actual.dropLast(1)
            else -> if (actual.length < 12) actual + tecla else actual
        }
        _state.value = _state.value.copy(raw = nuevo)
    }

    val monto: Long get() = _state.value.raw.toLongOrNull() ?: 0L

    fun confirmar() {
        if (monto <= 0) return
        _state.value = _state.value.copy(enviando = true, error = null)
        viewModelScope.launch {
            try {
                val activoId = prefs.lastActivoId() ?: throw IllegalStateException("Sin activo activo")
                val hoy = LocalDate.now()
                val venta = VentaEntity(
                    id = UUID.randomUUID().toString(),
                    activoId = activoId,
                    contratoId = null,
                    localIds = emptyList(),
                    etiquetaTienda = "Locatario móvil",
                    fuente = SaleSource.MANUAL,
                    ocurridoEn = hoy,
                    montoBruto = monto,
                    montoNeto = null,
                    numeroTicket = null,
                    textoCrudo = null,
                    referenciaImport = "locatario_portal",
                    importadoEn = Instant.now(),
                    syncState = SyncState.PENDING_UPLOAD
                )
                repo.registrar(venta)
                _state.value = ReporteVentasState(exito = true)
            } catch (e: Exception) {
                _state.value = _state.value.copy(enviando = false, error = e.message)
            }
        }
    }

    fun resetear() {
        _state.value = ReporteVentasState()
    }
}
