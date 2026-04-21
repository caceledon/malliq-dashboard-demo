package cl.malliq.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.time.Instant

enum class MutationKind { UPSERT, DELETE }

enum class MutationEntity {
    ACTIVO, LOCAL, LOCATARIO, CONTRATO, VENTA, DOCUMENTO, ALERTA
}

@Entity(
    tableName = "pending_mutations",
    indices = [Index("entidad"), Index("entidadId"), Index("creadoEn")]
)
data class PendingMutationEntity(
    @PrimaryKey val id: String,
    val entidad: MutationEntity,
    val entidadId: String,
    val tipo: MutationKind,
    val payloadJson: String,
    val intentos: Int = 0,
    val ultimoError: String? = null,
    val creadoEn: Instant
)
