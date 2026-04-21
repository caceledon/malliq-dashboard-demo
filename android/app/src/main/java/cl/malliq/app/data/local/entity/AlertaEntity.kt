package cl.malliq.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.time.Instant

@Entity(
    tableName = "alertas",
    indices = [Index("activoId"), Index("creadoEn")]
)
data class AlertaEntity(
    @PrimaryKey val id: String,
    val activoId: String,
    val tipo: AlertSeverity,
    val titulo: String,
    val descripcion: String,
    val contratoId: String?,
    val localId: String?,
    val leida: Boolean = false,
    val creadoEn: Instant
)
