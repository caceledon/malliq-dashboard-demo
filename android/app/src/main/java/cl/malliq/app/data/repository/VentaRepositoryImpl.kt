package cl.malliq.app.data.repository

import cl.malliq.app.data.local.dao.PendingMutationDao
import cl.malliq.app.data.local.dao.VentaDao
import cl.malliq.app.data.local.entity.MutationEntity
import cl.malliq.app.data.local.entity.MutationKind
import cl.malliq.app.data.local.entity.PendingMutationEntity
import cl.malliq.app.data.local.entity.SyncState
import cl.malliq.app.data.local.entity.VentaEntity
import cl.malliq.app.data.sync.SyncScheduler
import cl.malliq.app.domain.repository.VentaRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class VentaRepositoryImpl @Inject constructor(
    private val dao: VentaDao,
    private val mutations: PendingMutationDao,
    private val scheduler: SyncScheduler,
    private val json: Json
) : VentaRepository {

    override fun observarPorRango(activoId: String, desde: LocalDate, hasta: LocalDate): Flow<List<VentaEntity>> =
        dao.observarPorRango(activoId, desde, hasta)

    override fun sumaPorActivo(activoId: String, desde: LocalDate, hasta: LocalDate): Flow<Long> =
        dao.sumaPorActivo(activoId, desde, hasta)

    override suspend fun sumaPorContrato(contratoId: String, desde: LocalDate, hasta: LocalDate): Long =
        dao.sumaPorContrato(contratoId, desde, hasta)

    override suspend fun registrar(venta: VentaEntity) {
        val dirty = venta.copy(syncState = SyncState.PENDING_UPLOAD, importadoEn = Instant.now())
        dao.upsert(dirty)
        mutations.encolar(
            PendingMutationEntity(
                id = UUID.randomUUID().toString(),
                entidad = MutationEntity.VENTA,
                entidadId = venta.id,
                tipo = MutationKind.UPSERT,
                payloadJson = json.encodeToString(dirty),
                creadoEn = Instant.now()
            )
        )
        scheduler.schedulePush()
    }
}
