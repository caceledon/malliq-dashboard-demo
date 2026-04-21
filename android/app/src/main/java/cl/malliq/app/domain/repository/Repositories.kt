package cl.malliq.app.domain.repository

import cl.malliq.app.data.local.entity.ActivoEntity
import cl.malliq.app.data.local.entity.AlertaEntity
import cl.malliq.app.data.local.entity.ContratoEntity
import cl.malliq.app.data.local.entity.LocalEntity
import cl.malliq.app.data.local.entity.LocatarioEntity
import cl.malliq.app.data.local.entity.VentaEntity
import kotlinx.coroutines.flow.Flow
import java.time.LocalDate

interface ActivoRepository {
    fun observarTodos(): Flow<List<ActivoEntity>>
    fun observarPorId(id: String): Flow<ActivoEntity?>
    suspend fun upsert(activo: ActivoEntity)
}

interface LocalRepository {
    fun observarPorActivo(activoId: String): Flow<List<LocalEntity>>
    suspend fun obtenerPorIds(ids: List<String>): List<LocalEntity>
    suspend fun upsert(local: LocalEntity)
}

interface LocatarioRepository {
    fun observarPorActivo(activoId: String): Flow<List<LocatarioEntity>>
    fun observarPorId(id: String): Flow<LocatarioEntity?>
    suspend fun upsert(locatario: LocatarioEntity)
}

interface ContratoRepository {
    fun observarPorActivo(activoId: String): Flow<List<ContratoEntity>>
    fun observarPorLocatario(locatarioId: String): Flow<List<ContratoEntity>>
    fun observarPorId(id: String): Flow<ContratoEntity?>
    fun garantiasPorVencer(activoId: String, dias: Int): Flow<List<ContratoEntity>>
    suspend fun upsert(contrato: ContratoEntity)
}

interface VentaRepository {
    fun observarPorRango(activoId: String, desde: LocalDate, hasta: LocalDate): Flow<List<VentaEntity>>
    fun sumaPorActivo(activoId: String, desde: LocalDate, hasta: LocalDate): Flow<Long>
    suspend fun sumaPorContrato(contratoId: String, desde: LocalDate, hasta: LocalDate): Long
    suspend fun registrar(venta: VentaEntity)
}

interface AlertaRepository {
    fun observarPorActivo(activoId: String): Flow<List<AlertaEntity>>
    fun contarNoLeidas(activoId: String): Flow<Int>
    suspend fun marcarLeida(id: String)
    suspend fun regenerar(activoId: String)
}
