package cl.malliq.app.data.preferences

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.syncStore by preferencesDataStore(name = "malliq_sync")

@Singleton
class SyncPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private object Keys {
        val LAST_ACTIVO = stringPreferencesKey("last_activo")
        val LAST_SYNC = longPreferencesKey("last_sync_at")
        val FCM_TOKEN = stringPreferencesKey("fcm_token")
        val PORTAL = stringPreferencesKey("portal")
    }

    val portalFlow: Flow<String> = context.syncStore.data.map { it[Keys.PORTAL] ?: "admin" }
    val activoFlow: Flow<String?> = context.syncStore.data.map { it[Keys.LAST_ACTIVO] }

    suspend fun lastActivoId(): String? = context.syncStore.data.first()[Keys.LAST_ACTIVO]
    suspend fun lastSyncAt(): Long = context.syncStore.data.first()[Keys.LAST_SYNC] ?: 0L

    suspend fun updateLastSync(activoId: String, until: Long) {
        context.syncStore.edit {
            it[Keys.LAST_ACTIVO] = activoId
            it[Keys.LAST_SYNC] = until
        }
    }

    suspend fun setActivo(id: String) {
        context.syncStore.edit { it[Keys.LAST_ACTIVO] = id }
    }

    suspend fun setFcmToken(token: String) {
        context.syncStore.edit { it[Keys.FCM_TOKEN] = token }
    }

    suspend fun setPortal(portal: String) {
        context.syncStore.edit { it[Keys.PORTAL] = portal }
    }
}
