package cl.malliq.app.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import java.time.Instant

@Entity(
    tableName = "locatarios",
    foreignKeys = [ForeignKey(
        entity = ActivoEntity::class,
        parentColumns = ["id"],
        childColumns = ["activoId"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("activoId"), Index("razonSocial")]
)
data class LocatarioEntity(
    @PrimaryKey val id: String,
    val activoId: String,
    val razonSocial: String,
    val nombreComercial: String,
    val rut: String?,
    val categoria: String,
    val contactoNombre: String?,
    val contactoEmail: String?,
    val contactoTelefono: String?,
    val saludPuntaje: Int,
    val riesgoDefault90d: Float,
    val updatedAt: Instant,
    val syncState: SyncState = SyncState.SYNCED
)
