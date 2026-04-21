package cl.malliq.app.data.remote.api

import cl.malliq.app.data.remote.dto.SyncPullResponse
import cl.malliq.app.data.remote.dto.SyncPushRequest
import cl.malliq.app.data.remote.dto.SyncPushResponse
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.Body
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Query

interface MallIqApi {

    @POST("api/sync/push")
    suspend fun push(@Body request: SyncPushRequest): SyncPushResponse

    @POST("api/sync/pull")
    suspend fun pull(@Query("activoId") activoId: String, @Query("since") since: Long): SyncPullResponse

    @POST("api/fcm/register")
    suspend fun registrarTokenFcm(@Body token: FcmTokenRequest)

    @Multipart
    @POST("api/autofill/contract")
    suspend fun extraerContrato(
        @Part pdf: MultipartBody.Part,
        @Part("activoId") activoId: RequestBody
    ): AutofillResponse
}

@kotlinx.serialization.Serializable
data class FcmTokenRequest(val token: String, val device: String)

@kotlinx.serialization.Serializable
data class AutofillResponse(
    val campos: List<AutofillCampo>,
    val raw: String
)

@kotlinx.serialization.Serializable
data class AutofillCampo(
    val clave: String,
    val valor: String,
    val confianza: Float,
    val fragmento: String,
    val pagina: Int = 0
)
