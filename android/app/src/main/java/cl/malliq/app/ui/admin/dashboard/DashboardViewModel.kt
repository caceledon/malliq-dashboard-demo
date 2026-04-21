package cl.malliq.app.ui.admin.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import cl.malliq.app.data.local.entity.ActivoEntity
import cl.malliq.app.data.preferences.SyncPreferences
import cl.malliq.app.domain.model.ResumenActivo
import cl.malliq.app.domain.repository.ActivoRepository
import cl.malliq.app.domain.repository.AlertaRepository
import cl.malliq.app.domain.repository.ContratoRepository
import cl.malliq.app.domain.usecase.ConstruirResumenActivo
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardState(
    val activo: ActivoEntity? = null,
    val listaActivos: List<ActivoEntity> = emptyList(),
    val resumen: ResumenActivo? = null,
    val alertasCount: Int = 0,
    val cargando: Boolean = true
)

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val activoRepo: ActivoRepository,
    private val alertaRepo: AlertaRepository,
    private val resumenUseCase: ConstruirResumenActivo,
    private val prefs: SyncPreferences
) : ViewModel() {

    private val activoIdFlow = prefs.activoFlow

    val state: StateFlow<DashboardState> = activoRepo.observarTodos()
        .flatMapLatest { lista ->
            activoIdFlow.flatMapLatest { selectedId ->
                val actual = lista.firstOrNull { it.id == selectedId } ?: lista.firstOrNull()
                if (actual == null) flowOf(DashboardState(listaActivos = lista, cargando = false))
                else combineResumen(actual, lista)
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), DashboardState())

    private fun combineResumen(activo: ActivoEntity, lista: List<ActivoEntity>) =
        kotlinx.coroutines.flow.combine(
            resumenUseCase(activo.id),
            alertaRepo.contarNoLeidas(activo.id)
        ) { resumen, count ->
            DashboardState(
                activo = activo,
                listaActivos = lista,
                resumen = resumen,
                alertasCount = count,
                cargando = false
            )
        }

    fun seleccionarActivo(id: String) {
        viewModelScope.launch { prefs.setActivo(id) }
    }
}
