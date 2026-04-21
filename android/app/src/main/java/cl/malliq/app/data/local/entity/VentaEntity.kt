package cl.malliq.app.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import java.time.Instant
import java.time.LocalDate

@Entity(
    tableName = "ventas",
    foreignKeys = [ForeignKey(
        entity = ContratoEntity::class,
        parentColumns = ["id"],
        childColumns = ["contratoId"],
        onDelete = ForeignKey.SET_NULL
    )],
    indices = [
        Index("contratoId"),
        Index("activoId"),
        Index("ocurridoEn")
    ]
)
data class VentaEntity(
    @PrimaryKey val id: String,
    val activoId: String,
    val contratoId: String?,
    val localIds: List<String>,
    val etiquetaTienda: String,
    val fuente: SaleSource,
    val ocurridoEn: LocalDate,
    val montoBruto: Long,
    val montoNeto: Long?,
    val numeroTicket: String?,
    val textoCrudo: String?,
    val referenciaImport: String?,
    val importadoEn: Instant,
    val syncState: SyncState = SyncState.SYNCED
)
