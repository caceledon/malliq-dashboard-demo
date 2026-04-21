package cl.malliq.app.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class SyncPushRequest(
    val mutations: List<MutationDto>
)

@Serializable
data class MutationDto(
    val id: String,
    val entidad: String,
    val entidadId: String,
    val tipo: String,
    val payload: String,
    val creadoEn: Long
)

@Serializable
data class SyncPushResponse(
    val applied: List<String>,
    val conflicts: List<ConflictDto> = emptyList()
)

@Serializable
data class ConflictDto(
    val mutationId: String,
    val serverVersion: String,
    val reason: String
)

@Serializable
data class SyncPullResponse(
    val since: Long,
    val until: Long,
    val activos: List<String> = emptyList(),
    val locales: List<String> = emptyList(),
    val locatarios: List<String> = emptyList(),
    val contratos: List<String> = emptyList(),
    val ventas: List<String> = emptyList(),
    val alertas: List<String> = emptyList(),
    val documentos: List<String> = emptyList()
)
