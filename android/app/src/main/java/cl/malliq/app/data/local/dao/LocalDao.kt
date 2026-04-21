package cl.malliq.app.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import cl.malliq.app.data.local.entity.LocalEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface LocalDao {

    @Query("SELECT * FROM locales WHERE activoId = :activoId ORDER BY codigo ASC")
    fun observarPorActivo(activoId: String): Flow<List<LocalEntity>>

    @Query("SELECT * FROM locales WHERE id IN (:ids)")
    suspend fun obtenerPorIds(ids: List<String>): List<LocalEntity>

    @Upsert
    suspend fun upsert(local: LocalEntity)

    @Upsert
    suspend fun upsertAll(locales: List<LocalEntity>)
}
