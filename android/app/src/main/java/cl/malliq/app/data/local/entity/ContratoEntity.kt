package cl.malliq.app.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable
import java.time.Instant
import java.time.LocalDate

@Entity(
    tableName = "contratos",
    foreignKeys = [
        ForeignKey(
            entity = LocatarioEntity::class,
            parentColumns = ["id"],
            childColumns = ["locatarioId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = ActivoEntity::class,
            parentColumns = ["id"],
            childColumns = ["activoId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index("locatarioId"),
        Index("activoId"),
        Index("vencimientoGarantia"),
        Index("fechaTermino")
    ]
)
data class ContratoEntity(
    @PrimaryKey val id: String,
    val activoId: String,
    val locatarioId: String,
    val localIds: List<String>,
    val fechaInicio: LocalDate,
    val fechaTermino: LocalDate,
    val rentaFijaClp: Long,
    val rentaBaseUfM2: Double,
    val porcentajeVariable: Double,
    val gastosComunes: Long,
    val fondoPromocion: Long,
    val derechoLlave: Long,
    val garantiaMonto: Long,
    val vencimientoGarantia: LocalDate?,
    val participacionVentasPct: Double,
    val escalonadosJson: String,
    val condiciones: String,
    val signatureStatus: SignatureStatus,
    val firmadoEn: Instant?,
    val healthPagoAlDia: Boolean,
    val healthEntregaVentas: Boolean,
    val healthNivelVenta: Boolean,
    val healthNivelRenta: Boolean,
    val healthPercepcionAdmin: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
    val syncState: SyncState = SyncState.SYNCED
)

@Serializable
data class RentStep(
    val id: String,
    val fechaInicio: String,
    val fechaTermino: String,
    val rentaFijaUfM2: Double
)
