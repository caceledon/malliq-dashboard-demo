package cl.malliq.app.data.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import cl.malliq.app.data.local.dao.PendingMutationDao
import cl.malliq.app.data.preferences.SyncPreferences
import cl.malliq.app.data.remote.api.MallIqApi
import cl.malliq.app.data.remote.dto.MutationDto
import cl.malliq.app.data.remote.dto.SyncPushRequest
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@HiltWorker
class SyncDeltaWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val api: MallIqApi,
    private val pending: PendingMutationDao,
    private val prefs: SyncPreferences
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val mode = inputData.getString(SyncScheduler.KEY_MODE) ?: SyncScheduler.MODE_PUSH

        runCatching {
            when (mode) {
                SyncScheduler.MODE_PUSH -> push()
                SyncScheduler.MODE_PULL -> {
                    val activoId = inputData.getString(SyncScheduler.KEY_ACTIVO) ?: return@withContext Result.failure()
                    val since = inputData.getLong(SyncScheduler.KEY_SINCE, 0)
                    pull(activoId, since)
                }
                SyncScheduler.MODE_SAFETY -> {
                    push()
                    prefs.lastActivoId()?.let { pull(it, prefs.lastSyncAt()) }
                }
            }
        }.fold(
            onSuccess = { Result.success() },
            onFailure = { err ->
                if (runAttemptCount < 5) Result.retry()
                else Result.failure()
            }
        )
    }

    private suspend fun push() {
        val pendientes = pending.pendientes(limite = 50)
        if (pendientes.isEmpty()) return

        val response = api.push(
            SyncPushRequest(
                mutations = pendientes.map { p ->
                    MutationDto(
                        id = p.id,
                        entidad = p.entidad.name,
                        entidadId = p.entidadId,
                        tipo = p.tipo.name,
                        payload = p.payloadJson,
                        creadoEn = p.creadoEn.toEpochMilli()
                    )
                }
            )
        )

        pending.eliminar(response.applied)
        response.conflicts.forEach { c ->
            pending.marcarFallo(c.mutationId, c.reason)
        }
    }

    private suspend fun pull(activoId: String, since: Long) {
        val response = api.pull(activoId, since)
        prefs.updateLastSync(activoId, response.until)
    }
}
