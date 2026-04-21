package cl.malliq.app.data.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.work.WorkManager
import cl.malliq.app.MainActivity
import cl.malliq.app.R
import cl.malliq.app.data.preferences.SyncPreferences
import cl.malliq.app.data.sync.SyncScheduler
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MallIqMessagingService : FirebaseMessagingService() {

    @Inject lateinit var prefs: SyncPreferences
    @Inject lateinit var scheduler: SyncScheduler

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        scope.launch { prefs.setFcmToken(token) }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val tipo = message.data["tipo"] ?: return
        when (tipo) {
            "garantia_por_vencer" -> notificar(Channels.GARANTIAS, message.data, tipo)
            "renta_atrasada" -> notificar(Channels.RENTAS, message.data, tipo)
            "venta_no_reportada" -> notificar(Channels.VENTAS, message.data, tipo)
            "sync_invalidado" -> {
                scope.launch {
                    val activoId = prefs.lastActivoId() ?: return@launch
                    scheduler.schedulePull(activoId, prefs.lastSyncAt())
                }
            }
            "sync_conflicto" -> notificar(Channels.SYNC, message.data, tipo)
        }
    }

    private fun notificar(channel: Channels, data: Map<String, String>, tipo: String) {
        Channels.ensureAll(this)
        val titulo = data["titulo"] ?: "MallIQ"
        val cuerpo = data["cuerpo"] ?: ""
        val contratoId = data["contratoId"]

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("deeplink_tipo", tipo)
            contratoId?.let { putExtra("contratoId", it) }
        }
        val pending = PendingIntent.getActivity(
            this, tipo.hashCode(), intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notif = NotificationCompat.Builder(this, channel.id)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(ContextCompat.getColor(this, R.color.accent_ambar))
            .setContentTitle(titulo)
            .setContentText(cuerpo)
            .setStyle(NotificationCompat.BigTextStyle().bigText(cuerpo))
            .setAutoCancel(true)
            .setContentIntent(pending)
            .setPriority(channel.priority)
            .apply {
                if (channel == Channels.GARANTIAS) {
                    addAction(0, "Renovar", pending)
                    addAction(0, "Posponer 7d", pending)
                }
            }
            .build()

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(data["id"]?.hashCode() ?: tipo.hashCode(), notif)
    }
}

enum class Channels(val id: String, val priority: Int) {
    GARANTIAS("malliq_garantias", NotificationCompat.PRIORITY_HIGH),
    RENTAS("malliq_rentas", NotificationCompat.PRIORITY_HIGH),
    VENTAS("malliq_ventas", NotificationCompat.PRIORITY_DEFAULT),
    SYNC("malliq_sync", NotificationCompat.PRIORITY_LOW);

    companion object {
        fun ensureAll(context: Context) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            listOf(
                Triple(GARANTIAS, R.string.channel_garantias_name, R.string.channel_garantias_desc),
                Triple(RENTAS, R.string.channel_rentas_name, R.string.channel_rentas_desc),
                Triple(VENTAS, R.string.channel_ventas_name, R.string.channel_ventas_desc),
                Triple(SYNC, R.string.channel_sync_name, R.string.channel_sync_desc)
            ).forEach { (ch, name, desc) ->
                val channel = NotificationChannel(
                    ch.id,
                    context.getString(name),
                    when (ch.priority) {
                        NotificationCompat.PRIORITY_HIGH -> NotificationManager.IMPORTANCE_HIGH
                        NotificationCompat.PRIORITY_LOW -> NotificationManager.IMPORTANCE_LOW
                        else -> NotificationManager.IMPORTANCE_DEFAULT
                    }
                ).apply {
                    description = context.getString(desc)
                }
                manager.createNotificationChannel(channel)
            }
        }
    }
}
