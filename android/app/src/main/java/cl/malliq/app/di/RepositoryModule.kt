package cl.malliq.app.di

import cl.malliq.app.data.repository.ActivoRepositoryImpl
import cl.malliq.app.data.repository.AlertaRepositoryImpl
import cl.malliq.app.data.repository.ContratoRepositoryImpl
import cl.malliq.app.data.repository.LocalRepositoryImpl
import cl.malliq.app.data.repository.LocatarioRepositoryImpl
import cl.malliq.app.data.repository.VentaRepositoryImpl
import cl.malliq.app.domain.repository.ActivoRepository
import cl.malliq.app.domain.repository.AlertaRepository
import cl.malliq.app.domain.repository.ContratoRepository
import cl.malliq.app.domain.repository.LocalRepository
import cl.malliq.app.domain.repository.LocatarioRepository
import cl.malliq.app.domain.repository.VentaRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds @Singleton abstract fun activoRepo(impl: ActivoRepositoryImpl): ActivoRepository
    @Binds @Singleton abstract fun localRepo(impl: LocalRepositoryImpl): LocalRepository
    @Binds @Singleton abstract fun locatarioRepo(impl: LocatarioRepositoryImpl): LocatarioRepository
    @Binds @Singleton abstract fun contratoRepo(impl: ContratoRepositoryImpl): ContratoRepository
    @Binds @Singleton abstract fun ventaRepo(impl: VentaRepositoryImpl): VentaRepository
    @Binds @Singleton abstract fun alertaRepo(impl: AlertaRepositoryImpl): AlertaRepository
}
