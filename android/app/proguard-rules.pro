-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

-keep,includedescriptorclasses class cl.malliq.app.**$$serializer { *; }
-keepclassmembers class cl.malliq.app.** {
    *** Companion;
}
-keepclasseswithmembers class cl.malliq.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}

-keep class cl.malliq.app.data.local.entity.** { *; }
-keep class cl.malliq.app.data.remote.dto.** { *; }
