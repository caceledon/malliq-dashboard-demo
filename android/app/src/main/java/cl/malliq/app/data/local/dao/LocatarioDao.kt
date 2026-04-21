package cl.malliq.app.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import cl.malliq.app.data.local.entity.LocatarioEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface LocatarioDao {

    @Query("SELECT * FROM locatarios WHERE activoId = :activoId ORDER BY razonSocial ASC")
    fun observarPorActivo(activoId: String): Flow<List<LocatarioEntity>>

    @Query("SELECT * FROM locatarios WHERE id = :id LIMIT 1")
    fun observarPorId(id: String): Flow<LocatarioEntity?>

    @Query("SELECT * FROM locatarios WHERE id = :id LIMIT 1")
    suspend fun obtener(id: String): LocatarioEntity?

    @Upsert
    suspend fun upsert(locatario: LocatarioEntity)

    @Upsert
    suspend fun upsertAll(locatarios: List<LocatarioEntity>)
}
