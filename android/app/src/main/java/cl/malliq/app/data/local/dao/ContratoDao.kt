package cl.malliq.app.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import cl.malliq.app.data.local.entity.ContratoEntity
import kotlinx.coroutines.flow.Flow
import java.time.LocalDate

@Dao
interface ContratoDao {

    @Query("""
        SELECT * FROM contratos
        WHERE activoId = :activoId
        ORDER BY fechaTermino ASC
    """)
    fun observarPorActivo(activoId: String): Flow<List<ContratoEntity>>

    @Query("SELECT * FROM contratos WHERE locatarioId = :locatarioId ORDER BY fechaTermino DESC")
    fun observarPorLocatario(locatarioId: String): Flow<List<ContratoEntity>>

    @Query("SELECT * FROM contratos WHERE id = :id LIMIT 1")
    fun observarPorId(id: String): Flow<ContratoEntity?>

    @Query("SELECT * FROM contratos WHERE id = :id LIMIT 1")
    suspend fun obtener(id: String): ContratoEntity?

    @Query("""
        SELECT * FROM contratos
        WHERE activoId = :activoId
          AND vencimientoGarantia IS NOT NULL
          AND vencimientoGarantia BETWEEN :hoy AND :limite
        ORDER BY vencimientoGarantia ASC
    """)
    fun garantiasPorVencer(activoId: String, hoy: LocalDate, limite: LocalDate): Flow<List<ContratoEntity>>

    @Query("""
        SELECT * FROM contratos
        WHERE activoId = :activoId
          AND fechaTermino BETWEEN :hoy AND :limite
        ORDER BY fechaTermino ASC
    """)
    fun contratosPorVencer(activoId: String, hoy: LocalDate, limite: LocalDate): Flow<List<ContratoEntity>>

    @Upsert
    suspend fun upsert(contrato: ContratoEntity)

    @Upsert
    suspend fun upsertAll(contratos: List<ContratoEntity>)

    @Query("DELETE FROM contratos WHERE id = :id")
    suspend fun eliminar(id: String)
}
