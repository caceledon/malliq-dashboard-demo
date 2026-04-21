package cl.malliq.app.domain.usecase

import cl.malliq.app.data.local.dao.AlertaDao
import cl.malliq.app.data.local.entity.AlertSeverity
import cl.malliq.app.data.local.entity.AlertaEntity
import cl.malliq.app.data.local.entity.Lifecycle
import cl.malliq.app.data.local.entity.SignatureStatus
import cl.malliq.app.domain.repository.ContratoRepository
import cl.malliq.app.domain.repository.LocatarioRepository
import kotlinx.coroutines.flow.first
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.UUID
import javax.inject.Inject

class GenerarAlertas @Inject constructor(
    private val contratoRepo: ContratoRepository,
    private val locatarioRepo: LocatarioRepository,
    private val alertaDao: AlertaDao
) {
    suspend operator fun invoke(activoId: String, referencia: LocalDate = LocalDate.now()) {
        val contratos = contratoRepo.observarPorActivo(activoId).first()
        val locatarios = locatarioRepo.observarPorActivo(activoId).first().associateBy { it.id }

        val nuevasAlertas = mutableListOf<AlertaEntity>()
        val ahora = Instant.now()

        contratos.forEach { contrato ->
            val lifecycle = ConstruirResumenActivo.lifecycle(contrato.fechaInicio, contrato.fechaTermino, referencia)
            val loc = locatarios[contrato.locatarioId]?.nombreComercial ?: "Locatario"

            if (contrato.signatureStatus != SignatureStatus.FIRMADO) {
                nuevasAlertas += AlertaEntity(
                    id = UUID.randomUUID().toString(),
                    activoId = activoId,
                    tipo = if (contrato.signatureStatus == SignatureStatus.PENDIENTE) AlertSeverity.CRITICAL else AlertSeverity.WARNING,
                    titulo = "Firma pendiente: $loc",
                    descripcion = "Contrato en estado ${contrato.signatureStatus.name.lowercase().replace('_', ' ')}.",
                    contratoId = contrato.id,
                    localId = null,
                    creadoEn = ahora
                )
            }

            if (lifecycle == Lifecycle.POR_VENCER) {
                val dias = ChronoUnit.DAYS.between(referencia, contrato.fechaTermino)
                nuevasAlertas += AlertaEntity(
                    id = UUID.randomUUID().toString(),
                    activoId = activoId,
                    tipo = AlertSeverity.WARNING,
                    titulo = "Contrato por vencer: $loc",
                    descripcion = "Vence en $dias días.",
                    contratoId = contrato.id,
                    localId = null,
                    creadoEn = ahora
                )
            }

            contrato.vencimientoGarantia?.let { fechaGarantia ->
                val dias = ChronoUnit.DAYS.between(referencia, fechaGarantia)
                when {
                    dias < 0 -> nuevasAlertas += AlertaEntity(
                        id = UUID.randomUUID().toString(),
                        activoId = activoId,
                        tipo = AlertSeverity.CRITICAL,
                        titulo = "Garantía vencida: $loc",
                        descripcion = "Venció el $fechaGarantia.",
                        contratoId = contrato.id,
                        localId = null,
                        creadoEn = ahora
                    )
                    dias <= 30 -> nuevasAlertas += AlertaEntity(
                        id = UUID.randomUUID().toString(),
                        activoId = activoId,
                        tipo = AlertSeverity.WARNING,
                        titulo = "Garantía por vencer: $loc",
                        descripcion = "Vence en $dias días ($fechaGarantia).",
                        contratoId = contrato.id,
                        localId = null,
                        creadoEn = ahora
                    )
                }
            }
        }

        alertaDao.limpiarPorActivo(activoId)
        alertaDao.upsertAll(nuevasAlertas)
    }
}
