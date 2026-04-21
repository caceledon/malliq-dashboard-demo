package cl.malliq.app.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import cl.malliq.app.data.local.entity.DocumentoEntity
import cl.malliq.app.data.local.entity.EntityType
import kotlinx.coroutines.flow.Flow

@Dao
interface DocumentoDao {

    @Query("SELECT * FROM documentos WHERE entityType = :tipo AND entityId = :id ORDER BY subidoEn DESC")
    fun observarPorEntidad(tipo: EntityType, id: String): Flow<List<DocumentoEntity>>

    @Upsert
    suspend fun upsert(doc: DocumentoEntity)

    @Query("DELETE FROM documentos WHERE id = :id")
    suspend fun eliminar(id: String)
}
