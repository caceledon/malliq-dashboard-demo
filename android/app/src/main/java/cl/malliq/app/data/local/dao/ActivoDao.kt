package cl.malliq.app.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import cl.malliq.app.data.local.entity.ActivoEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ActivoDao {

    @Query("SELECT * FROM activos ORDER BY nombre ASC")
    fun observarTodos(): Flow<List<ActivoEntity>>

    @Query("SELECT * FROM activos WHERE id = :id LIMIT 1")
    fun observarPorId(id: String): Flow<ActivoEntity?>

    @Query("SELECT * FROM activos WHERE id = :id LIMIT 1")
    suspend fun obtener(id: String): ActivoEntity?

    @Upsert
    suspend fun upsert(activo: ActivoEntity)

    @Upsert
    suspend fun upsertAll(activos: List<ActivoEntity>)

    @Query("DELETE FROM activos WHERE id = :id")
    suspend fun eliminar(id: String)
}
