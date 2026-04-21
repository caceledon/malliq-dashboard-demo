package cl.malliq.app.data.repository

import cl.malliq.app.data.local.dao.ContratoDao
import cl.malliq.app.data.local.dao.PendingMutationDao
import cl.malliq.app.data.local.entity.ContratoEntity
import cl.malliq.app.data.local.entity.MutationEntity
import cl.malliq.app.data.local.entity.MutationKind
import cl.malliq.app.data.local.entity.PendingMutationEntity
import cl.malliq.app.data.local.entity.SyncState
import cl.malliq.app.data.sync.SyncScheduler
import cl.malliq.app.domain.repository.ContratoRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ContratoRepositoryImpl @Inject constructor(
    private val dao: ContratoDao,
    private val mutations: PendingMutationDao,
    private val scheduler: SyncScheduler,
    private val json: Json
) : ContratoRepository {

    override fun observarPorActivo(activoId: String): Flow<List<ContratoEntity>> =
        dao.observarPorActivo(activoId)

    override fun observarPorLocatario(locatarioId: String): Flow<List<ContratoEntity>> =
        dao.observarPorLocatario(locatarioId)

    override fun observarPorId(id: String): Flow<ContratoEntity?> = dao.observarPorId(id)

    override fun garantiasPorVencer(activoId: String, dias: Int): Flow<List<ContratoEntity>> {
        val hoy = LocalDate.now()
        return dao.garantiasPorVencer(activoId, hoy, hoy.plusDays(dias.toLong()))
    }

    override suspend fun upsert(contrato: ContratoEntity) {
        val dirty = contrato.copy(syncState = SyncState.PENDING_UPLOAD, updatedAt = Instant.now())
        dao.upsert(dirty)
        mutations.encolar(
            PendingMutationEntity(
                id = UUID.randomUUID().toString(),
                entidad = MutationEntity.CONTRATO,
                entidadId = contrato.id,
                tipo = MutationKind.UPSERT,
                payloadJson = json.encodeToString(dirty),
                creadoEn = Instant.now()
            )
        )
        scheduler.schedulePush()
    }
}
