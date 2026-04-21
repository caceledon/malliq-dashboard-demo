package cl.malliq.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.time.Instant

enum class DocumentKind {
    CONTRATO, ANEXO, CARTA_OFERTA, CIP, FOTO, RENDER, PRESUPUESTO, FORECAST, PLANO, PERMISO, OTRO
}

enum class EntityType { ACTIVO, LOCAL, CONTRATO, LOCATARIO }

@Entity(
    tableName = "documentos",
    indices = [Index("entityType"), Index("entityId")]
)
data class DocumentoEntity(
    @PrimaryKey val id: String,
    val entityType: EntityType,
    val entityId: String,
    val nombre: String,
    val tipo: DocumentKind,
    val mimeType: String,
    val sizeBytes: Long,
    val nota: String?,
    val rutaLocal: String?,
    val rutaRemota: String?,
    val subidoEn: Instant,
    val syncState: SyncState = SyncState.SYNCED
)
