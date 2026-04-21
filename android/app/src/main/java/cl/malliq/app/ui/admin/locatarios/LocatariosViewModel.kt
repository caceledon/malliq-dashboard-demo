package cl.malliq.app.ui.admin.locatarios

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import cl.malliq.app.data.local.entity.LocatarioEntity
import cl.malliq.app.data.preferences.SyncPreferences
import cl.malliq.app.domain.repository.LocatarioRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class LocatariosViewModel @Inject constructor(
    prefs: SyncPreferences,
    repo: LocatarioRepository
) : ViewModel() {

    val lista: StateFlow<List<LocatarioEntity>> = prefs.activoFlow
        .flatMapLatest { id -> if (id == null) flowOf(emptyList()) else repo.observarPorActivo(id) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
}
