package cl.malliq.app.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import cl.malliq.app.data.local.entity.AlertaEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AlertaDao {

    @Query("SELECT * FROM alertas WHERE activoId = :activoId ORDER BY creadoEn DESC LIMIT 100")
    fun observarPorActivo(activoId: String): Flow<List<AlertaEntity>>

    @Query("SELECT COUNT(*) FROM alertas WHERE activoId = :activoId AND leida = 0")
    fun contarNoLeidas(activoId: String): Flow<Int>

    @Upsert
    suspend fun upsert(alerta: AlertaEntity)

    @Upsert
    suspend fun upsertAll(alertas: List<AlertaEntity>)

    @Query("UPDATE alertas SET leida = 1 WHERE id = :id")
    suspend fun marcarLeida(id: String)

    @Query("DELETE FROM alertas WHERE activoId = :activoId")
    suspend fun limpiarPorActivo(activoId: String)
}
