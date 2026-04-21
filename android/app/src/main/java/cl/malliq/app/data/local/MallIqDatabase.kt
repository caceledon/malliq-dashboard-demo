package cl.malliq.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import cl.malliq.app.data.local.converters.Converters
import cl.malliq.app.data.local.dao.ActivoDao
import cl.malliq.app.data.local.dao.AlertaDao
import cl.malliq.app.data.local.dao.ContratoDao
import cl.malliq.app.data.local.dao.DocumentoDao
import cl.malliq.app.data.local.dao.LocalDao
import cl.malliq.app.data.local.dao.LocatarioDao
import cl.malliq.app.data.local.dao.PendingMutationDao
import cl.malliq.app.data.local.dao.VentaDao
import cl.malliq.app.data.local.entity.ActivoEntity
import cl.malliq.app.data.local.entity.AlertaEntity
import cl.malliq.app.data.local.entity.ContratoEntity
import cl.malliq.app.data.local.entity.DocumentoEntity
import cl.malliq.app.data.local.entity.LocalEntity
import cl.malliq.app.data.local.entity.LocatarioEntity
import cl.malliq.app.data.local.entity.PendingMutationEntity
import cl.malliq.app.data.local.entity.VentaEntity

@Database(
    entities = [
        ActivoEntity::class,
        LocalEntity::class,
        LocatarioEntity::class,
        ContratoEntity::class,
        VentaEntity::class,
        AlertaEntity::class,
        DocumentoEntity::class,
        PendingMutationEntity::class
    ],
    version = 1,
    exportSchema = true
)
@TypeConverters(Converters::class)
abstract class MallIqDatabase : RoomDatabase() {
    abstract fun activoDao(): ActivoDao
    abstract fun localDao(): LocalDao
    abstract fun locatarioDao(): LocatarioDao
    abstract fun contratoDao(): ContratoDao
    abstract fun ventaDao(): VentaDao
    abstract fun alertaDao(): AlertaDao
    abstract fun documentoDao(): DocumentoDao
    abstract fun pendingMutationDao(): PendingMutationDao

    companion object {
        const val DB_NAME = "malliq.db"
    }
}
