package cl.malliq.app.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import cl.malliq.app.data.local.entity.VentaEntity
import kotlinx.coroutines.flow.Flow
import java.time.LocalDate

@Dao
interface VentaDao {

    @Query("""
        SELECT * FROM ventas
        WHERE activoId = :activoId
          AND ocurridoEn BETWEEN :desde AND :hasta
        ORDER BY ocurridoEn DESC
    """)
    fun observarPorRango(activoId: String, desde: LocalDate, hasta: LocalDate): Flow<List<VentaEntity>>

    @Query("""
        SELECT * FROM ventas
        WHERE contratoId = :contratoId
          AND ocurridoEn BETWEEN :desde AND :hasta
        ORDER BY ocurridoEn DESC
    """)
    fun observarPorContrato(contratoId: String, desde: LocalDate, hasta: LocalDate): Flow<List<VentaEntity>>

    @Query("""
        SELECT COALESCE(SUM(montoBruto), 0) FROM ventas
        WHERE contratoId = :contratoId
          AND ocurridoEn BETWEEN :desde AND :hasta
    """)
    suspend fun sumaPorContrato(contratoId: String, desde: LocalDate, hasta: LocalDate): Long

    @Query("""
        SELECT COALESCE(SUM(montoBruto), 0) FROM ventas
        WHERE activoId = :activoId
          AND ocurridoEn BETWEEN :desde AND :hasta
    """)
    fun sumaPorActivo(activoId: String, desde: LocalDate, hasta: LocalDate): Flow<Long>

    @Upsert
    suspend fun upsert(venta: VentaEntity)

    @Upsert
    suspend fun upsertAll(ventas: List<VentaEntity>)
}
