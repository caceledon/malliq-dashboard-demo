package cl.malliq.app.data.repository

import cl.malliq.app.data.local.dao.ActivoDao
import cl.malliq.app.data.local.dao.PendingMutationDao
import cl.malliq.app.data.local.entity.ActivoEntity
import cl.malliq.app.data.local.entity.MutationEntity
import cl.malliq.app.data.local.entity.MutationKind
import cl.malliq.app.data.local.entity.PendingMutationEntity
import cl.malliq.app.data.local.entity.SyncState
import cl.malliq.app.data.sync.SyncScheduler
import cl.malliq.app.domain.repository.ActivoRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ActivoRepositoryImpl @Inject constructor(
    private val dao: ActivoDao,
    private val mutations: PendingMutationDao,
    private val scheduler: SyncScheduler,
    private val json: Json
) : ActivoRepository {

    override fun observarTodos(): Flow<List<ActivoEntity>> = dao.observarTodos()

    override fun observarPorId(id: String): Flow<ActivoEntity?> = dao.observarPorId(id)

    override suspend fun upsert(activo: ActivoEntity) {
        val dirty = activo.copy(syncState = SyncState.PENDING_UPLOAD, updatedAt = Instant.now())
        dao.upsert(dirty)
        mutations.encolar(
            PendingMutationEntity(
                id = UUID.randomUUID().toString(),
                entidad = MutationEntity.ACTIVO,
                entidadId = activo.id,
                tipo = MutationKind.UPSERT,
                payloadJson = json.encodeToString(dirty),
                creadoEn = Instant.now()
            )
        )
        scheduler.schedulePush()
    }
}
