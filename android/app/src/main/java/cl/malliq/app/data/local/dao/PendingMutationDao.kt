package cl.malliq.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import cl.malliq.app.data.local.entity.PendingMutationEntity

@Dao
interface PendingMutationDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun encolar(mutation: PendingMutationEntity)

    @Query("SELECT * FROM pending_mutations ORDER BY creadoEn ASC LIMIT :limite")
    suspend fun pendientes(limite: Int = 50): List<PendingMutationEntity>

    @Query("SELECT COUNT(*) FROM pending_mutations")
    suspend fun cantidadPendientes(): Int

    @Query("UPDATE pending_mutations SET intentos = intentos + 1, ultimoError = :error WHERE id = :id")
    suspend fun marcarFallo(id: String, error: String)

    @Query("DELETE FROM pending_mutations WHERE id IN (:ids)")
    suspend fun eliminar(ids: List<String>)
}
