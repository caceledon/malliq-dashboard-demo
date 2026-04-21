package cl.malliq.app.di

import android.content.Context
import androidx.room.Room
import cl.malliq.app.data.local.MallIqDatabase
import cl.malliq.app.data.local.dao.ActivoDao
import cl.malliq.app.data.local.dao.AlertaDao
import cl.malliq.app.data.local.dao.ContratoDao
import cl.malliq.app.data.local.dao.DocumentoDao
import cl.malliq.app.data.local.dao.LocalDao
import cl.malliq.app.data.local.dao.LocatarioDao
import cl.malliq.app.data.local.dao.PendingMutationDao
import cl.malliq.app.data.local.dao.VentaDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): MallIqDatabase =
        Room.databaseBuilder(context, MallIqDatabase::class.java, MallIqDatabase.DB_NAME)
            .fallbackToDestructiveMigrationFrom(dropAllTables = true)
            .build()

    @Provides fun activoDao(db: MallIqDatabase): ActivoDao = db.activoDao()
    @Provides fun localDao(db: MallIqDatabase): LocalDao = db.localDao()
    @Provides fun locatarioDao(db: MallIqDatabase): LocatarioDao = db.locatarioDao()
    @Provides fun contratoDao(db: MallIqDatabase): ContratoDao = db.contratoDao()
    @Provides fun ventaDao(db: MallIqDatabase): VentaDao = db.ventaDao()
    @Provides fun alertaDao(db: MallIqDatabase): AlertaDao = db.alertaDao()
    @Provides fun documentoDao(db: MallIqDatabase): DocumentoDao = db.documentoDao()
    @Provides fun pendingMutationDao(db: MallIqDatabase): PendingMutationDao = db.pendingMutationDao()
}
