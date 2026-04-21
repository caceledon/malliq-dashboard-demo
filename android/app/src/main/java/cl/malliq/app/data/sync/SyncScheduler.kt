package cl.malliq.app.data.sync

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import dagger.hilt.android.qualifiers.ApplicationContext
import java.time.Duration
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SyncScheduler @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val wm by lazy { WorkManager.getInstance(context) }

    fun schedulePush() {
        val request = OneTimeWorkRequestBuilder<SyncDeltaWorker>()
            .setConstraints(networkConstraints())
            .setInputData(workDataOf(KEY_MODE to MODE_PUSH))
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, Duration.ofSeconds(30))
            .build()
        wm.enqueueUniqueWork(WORK_PUSH, ExistingWorkPolicy.REPLACE, request)
    }

    fun schedulePull(activoId: String, since: Long) {
        val request = OneTimeWorkRequestBuilder<SyncDeltaWorker>()
            .setConstraints(networkConstraints())
            .setInputData(workDataOf(
                KEY_MODE to MODE_PULL,
                KEY_ACTIVO to activoId,
                KEY_SINCE to since
            ))
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, Duration.ofSeconds(30))
            .build()
        wm.enqueueUniqueWork("$WORK_PULL-$activoId", ExistingWorkPolicy.REPLACE, request)
    }

    fun scheduleSafetyNet() {
        val request = PeriodicWorkRequestBuilder<SyncDeltaWorker>(30, TimeUnit.MINUTES)
            .setConstraints(networkConstraints())
            .setInputData(workDataOf(KEY_MODE to MODE_SAFETY))
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, Duration.ofMinutes(2))
            .build()
        wm.enqueueUniquePeriodicWork(WORK_SAFETY, ExistingPeriodicWorkPolicy.KEEP, request)
    }

    private fun networkConstraints() = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .setRequiresBatteryNotLow(false)
        .build()

    companion object {
        const val KEY_MODE = "mode"
        const val KEY_ACTIVO = "activoId"
        const val KEY_SINCE = "since"
        const val MODE_PUSH = "push"
        const val MODE_PULL = "pull"
        const val MODE_SAFETY = "safety"
        const val WORK_PUSH = "malliq_sync_push"
        const val WORK_PULL = "malliq_sync_pull"
        const val WORK_SAFETY = "malliq_sync_safety"
    }
}
