package cl.malliq.app.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import java.time.Instant

@Entity(
    tableName = "locales",
    foreignKeys = [ForeignKey(
        entity = ActivoEntity::class,
        parentColumns = ["id"],
        childColumns = ["activoId"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("activoId"), Index("codigo")]
)
data class LocalEntity(
    @PrimaryKey val id: String,
    val activoId: String,
    val codigo: String,
    val etiqueta: String,
    val areaM2: Double,
    val nivel: String,
    val frente: Double?,
    val profundidad: Double?,
    val notas: String?,
    val categoriaManual: String?,
    val displayNameManual: String?,
    val updatedAt: Instant,
    val syncState: SyncState = SyncState.SYNCED
)
