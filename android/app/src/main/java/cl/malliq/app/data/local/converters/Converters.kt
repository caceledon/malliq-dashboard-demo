package cl.malliq.app.data.local.converters

import androidx.room.TypeConverter
import cl.malliq.app.data.local.entity.AlertSeverity
import cl.malliq.app.data.local.entity.DocumentKind
import cl.malliq.app.data.local.entity.EntityType
import cl.malliq.app.data.local.entity.Moneda
import cl.malliq.app.data.local.entity.MutationEntity
import cl.malliq.app.data.local.entity.MutationKind
import cl.malliq.app.data.local.entity.SaleSource
import cl.malliq.app.data.local.entity.SignatureStatus
import cl.malliq.app.data.local.entity.SyncState
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant
import java.time.LocalDate

class Converters {

    @TypeConverter fun instantToMillis(value: Instant?): Long? = value?.toEpochMilli()
    @TypeConverter fun millisToInstant(value: Long?): Instant? = value?.let(Instant::ofEpochMilli)

    @TypeConverter fun localDateToString(value: LocalDate?): String? = value?.toString()
    @TypeConverter fun stringToLocalDate(value: String?): LocalDate? = value?.let(LocalDate::parse)

    @TypeConverter
    fun stringListToJson(value: List<String>?): String =
        value?.let(json::encodeToString) ?: "[]"

    @TypeConverter
    fun jsonToStringList(value: String?): List<String> =
        value?.takeIf { it.isNotBlank() }?.let { json.decodeFromString<List<String>>(it) } ?: emptyList()

    @TypeConverter fun syncStateToString(v: SyncState): String = v.name
    @TypeConverter fun stringToSyncState(v: String): SyncState = SyncState.valueOf(v)

    @TypeConverter fun monedaToString(v: Moneda): String = v.name
    @TypeConverter fun stringToMoneda(v: String): Moneda = Moneda.valueOf(v)

    @TypeConverter fun signatureToString(v: SignatureStatus): String = v.name
    @TypeConverter fun stringToSignature(v: String): SignatureStatus = SignatureStatus.valueOf(v)

    @TypeConverter fun sourceToString(v: SaleSource): String = v.name
    @TypeConverter fun stringToSource(v: String): SaleSource = SaleSource.valueOf(v)

    @TypeConverter fun severityToString(v: AlertSeverity): String = v.name
    @TypeConverter fun stringToSeverity(v: String): AlertSeverity = AlertSeverity.valueOf(v)

    @TypeConverter fun mutationKindToString(v: MutationKind): String = v.name
    @TypeConverter fun stringToMutationKind(v: String): MutationKind = MutationKind.valueOf(v)

    @TypeConverter fun mutationEntityToString(v: MutationEntity): String = v.name
    @TypeConverter fun stringToMutationEntity(v: String): MutationEntity = MutationEntity.valueOf(v)

    @TypeConverter fun docKindToString(v: DocumentKind): String = v.name
    @TypeConverter fun stringToDocKind(v: String): DocumentKind = DocumentKind.valueOf(v)

    @TypeConverter fun entityTypeToString(v: EntityType): String = v.name
    @TypeConverter fun stringToEntityType(v: String): EntityType = EntityType.valueOf(v)

    companion object {
        val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }
    }
}
