# MallIQ Android

Migración nativa del SPA React a Kotlin + Jetpack Compose.

## Requisitos
- Android Studio Ladybug o superior
- JDK 17
- Android SDK 35
- `google-services.json` (para FCM) bajo `app/` — no versionado
- Opcional: archivos de fuentes `Inter Display` y `JetBrains Mono` bajo `app/src/main/res/font/` (hoy se usa fallback a FontFamily.SansSerif / Monospace)

## Primera compilación
1. Abrir la carpeta `android/` como proyecto en Android Studio.
2. Dejar que Gradle sincronice (descarga AGP 8.7, Kotlin 2.1, KSP, Hilt, Room).
3. Run > `app` sobre un emulador API 26+.

Si no usas Android Studio, desde una terminal con Gradle 8.11 instalado:
```
cd android
gradle wrapper
./gradlew assembleDebug
```

## Arquitectura
- **MVI + Flow** con `StateFlow` por pantalla.
- **Room** como fuente de verdad local.
- **WorkManager + FCM** en vez de polling HTTP.
- **Hilt** para DI.
- **Jetpack Compose** con type-safe navigation.

## Estructura
```
app/src/main/java/cl/malliq/app/
├── data/
│   ├── local/            Room entities, DAOs, converters
│   ├── remote/           Retrofit API, DTOs
│   ├── repository/       Implementaciones repository
│   ├── sync/             SyncScheduler + SyncDeltaWorker
│   ├── push/             MallIqMessagingService
│   └── preferences/      DataStore
├── domain/
│   ├── model/            Modelos de dominio, FinanceMath
│   ├── repository/       Interfaces
│   └── usecase/          CalculadoraSalud, GenerarAlertas, etc.
├── di/                   Hilt modules
├── ui/
│   ├── theme/            Color, Type, Shape, Theme
│   ├── components/       TarjetaKpi, StatusPill, ...
│   ├── navigation/       NavHost + destinos type-safe
│   ├── admin/            Dashboard, Locatarios, Contratos, ActivoSwitcher
│   ├── locatario/        Home, Ventas, Contrato
│   ├── scanner/          CameraX + ML Kit + BoletaParser
│   ├── autofill/         Revisión de campos autofill
│   └── biometric/        BiometricGate
└── util/                 Formateo, SecureStore (Keystore AES-GCM)
```

## TODOs conocidos
- Integrar fuentes custom (hoy hay fallback).
- Ícono adaptativo final.
- Migraciones Room cuando cambie el schema v1.
- Conectar endpoints reales del backend Node al cliente Retrofit.
- Añadir tests unitarios para CalculadoraSalud y BoletaParser.
