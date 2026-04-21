package cl.malliq.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.time.Instant

@Entity(tableName = "activos")
data class ActivoEntity(
    @PrimaryKey val id: String,
    val nombre: String,
    val ciudad: String,
    val region: String,
    val gla: Double,
    val monedaBase: Moneda,
    val ufActual: Double,
    val temaPreferido: String,
    val backendUrl: String?,
    val syncEnabled: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
    val syncState: SyncState = SyncState.SYNCED
)
