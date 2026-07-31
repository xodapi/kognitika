# Mobile / Capacitor (Android)

**Статус**: ⏸️ **Paused** — требует acceptance gates · **Target**: Android 8+ (API 26+) · **Store**: Google Play (внутреннее тестирование)

---

## Архитектура

```
┌─────────────────────────────────────┐
│           Capacitor App             │
│  ┌──────────────┐  ┌─────────────┐  │
│  │  WebView     │  │  Native     │  │
│  │  (Vite/React)│◄─►│  Plugins    │  │
│  └──────────────┘  └─────────────┘  │
│         │                │          │
│         ▼                ▼          │
│  ┌──────────────────────────────┐  │
│  │  Capacitor Bridge (JS ↔ Native) │ │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Стек
| Компонент | Версия | Назначение |
|---|---|---|
| **@capacitor/core** | 6.x | Runtime, bridge |
| **@capacitor/android** | 6.x | Android платформа |
| **@capacitor/cli** | 6.x | Build, sync, run |
| **@capacitor/splash-screen** | 6.x | Нативный сплеш |
| **@capacitor/status-bar** | 6.x | Статус-бар темизация |
| **@capacitor/keyboard** | 6.x | Keyboard handling |
| **@capacitor/haptics** | 6.x | Тактильная обратная связь |
| **@capacitor/local-notifications** | 6.x | Push/локальные уведомления |
| **@capacitor/preferences** | 6.x | Secure storage (Keychain/Keystore) |
| **@capacitor/network** | 6.x | Network status listener |
| **@capacitor/app** | 6.x | App lifecycle, deep links |

---

## Конфигурация (`capacitor.config.ts`)

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ru.kognitika',
  appName: 'Когнитику',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: undefined, // CI secret
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keyPassword: undefined,
    },
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // prod = false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f172a',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_kognitika',
      iconColor: '#3b82f6',
      sound: 'beep.wav',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
```

---

## Acceptance Gates (Must Pass Before Resume)

| Gate | Критерий | Статус | Документ |
|---|---|---|---|
| **Frame Budget** | 60 FPS на тренажёрах (Schulte 5×5, Stroop 60s) | ⏸️ | `docs/frame-budget-benchmark.md` |
| **PWA/Offline Strategy** | Service Worker + IndexedDB sync, conflict resolution | ⏸️ | `docs/pwa-offline-strategy.md` |
| **WASM Hot-path** | `analyzeSession` WASM < 2ms p95 на 1000 clicks | ⏸️ | `docs/wasm-hotpath-benchmark.md` |
| **Privacy Review** | Нет PII в нативном хранилище, нет трекеров | ⏸️ | `docs/privacy-model.md` |
| **Security Audit** | No WebView vulns, CSP, certificate pinning | ⏸️ | `docs/security-audit.md` |
| **Store Compliance** | Data Safety Form, Target API 34, 64-bit | ⏸️ | `docs/play-store-checklist.md` |

> **Правило**: Никаких коммитов в `android/` до прохождения ВСЕХ gates. Исключение — обновление конфига Capacitor / плагинов.

---

## Build Pipeline

```bash
# Local development
pnpm build                    # Vite build → dist/
pnpm cap sync android         # Copy dist + plugins → android/
pnpm cap open android         # Open in Android Studio

# CI (GitHub Actions)
# .github/workflows/android.yml
```

### CI Configuration (Planned)
```yaml
# .github/workflows/android.yml
android:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
    - uses: actions/setup-node@v4
      with: { node-version: '20', cache: 'pnpm' }
    - run: pnpm install --frozen-lockfile
    - run: pnpm build
    - uses: android-actions/setup-android@v3
    - run: pnpm cap sync android
    - run: ./gradlew assembleRelease -p android
    - uses: actions/upload-artifact@v4
      with:
        name: app-release.aab
        path: android/app/build/outputs/bundle/release/app-release.aab
```

---

## Native Plugins (Custom)

### 1. `kognitika-analytics` (Native Module)
**Назначение**: Batch-сборка аналитики в фоне, экспорт в EncryptedSharedPreferences
```kotlin
// android/plugins/kognitika-analytics/src/main/kotlin/.../AnalyticsPlugin.kt
@CapacitorPlugin(name = "KognitikaAnalytics")
class AnalyticsPlugin : Plugin() {
    @PluginMethod
    fun batchTrack(call: PluginCall) { /* ... */ }
    
    @PluginMethod
    fun flush(call: PluginCall) { /* ... */ }
    
    @PluginMethod
    fun getStoredEvents(call: PluginCall) { /* ... */ }
}
```

### 2. `kognitika-haptics` (Enhanced)
**Назначение**: Продвинутая тактильная обратная связь для тренажёров
```typescript
// src/plugins/haptics.ts
export async function hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'error') {
  await Haptics.impact({ style: type });
}

export async function selectionChanged() {
  await Haptics.selectionStart();
}
```

---

## Deep Links & App Links

| Схема | Host | Path | Действие |
|---|---|---|---|
| `kognitika://` | `app` | `/duel/join/:id` | Присоединиться к дуэли |
| `kognitika://` | `app` | `/trainer/:module` | Открыть тренажёр |
| `https://kognitika.ru` | `kognitika.ru` | `/duel/join/:id` | App Link (verified) |
| `https://kognitika.ru` | `kognitika.ru` | `/trainer/:module` | App Link |

### Asset Links (Digital Asset Links)
```json
// .well-known/assetlinks.json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "ru.kognitika",
    "sha256_cert_fingerprints": ["SHA256:..."]
  }
}]
```

---

## Permissions (AndroidManifest.xml)

```xml
<!-- Minimum -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Notifications (API 33+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Optional: Biometric for Brain ID backup -->
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />

<!-- Not used (privacy) -->
<!-- <uses-permission android:name="android.permission.CAMERA" /> -->
<!-- <uses-permission android:name="android.permission.RECORD_AUDIO" /> -->
<!-- <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" /> -->
```

---

## Data Storage Strategy

| Данные | Web | Android (Native) | Sync |
|---|---|---|---|
| **Brain ID** | localStorage | EncryptedSharedPreferences (Keystore) | One-way: Web → Native (backup) |
| **Sessions** | IndexedDB | SQLite (Room) — только кэш последних 50 | Server-first, native = offline cache |
| **Preferences** | localStorage | DataStore (Preferences) | Bi-directional |
| **Analytics Queue** | Memory + localStorage | EncryptedSharedPreferences | Background sync → Server |
| **Offline Queue** | IndexedDB | Room DB | Conflict resolution: Server wins |

---

## Offline-First Architecture (Planned)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   WebView   │────►│  Service    │────►│  Background │
│   (React)   │     │  Worker     │     │  Sync       │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  IndexedDB  │     │   Room DB   │
                    │  (Primary)  │◄───►│  (Mirror)   │
                    └─────────────┘     └─────────────┘
```

**Conflict Resolution**: Server authoritative. Local changes → queue → sync → server response → update local.

---

## Testing on Device

```bash
# Debug APK
pnpm cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Release AAB (for Play Console)
cd android && ./gradlew bundleRelease
# Upload: android/app/build/outputs/bundle/release/app-release.aab
```

### Device Testing Checklist
- [ ] Cold start < 3s (Splash → Interactive)
- [ ] Schulte 5×5: 60 FPS, нет дропов фреймов
- [ ] Stroop 60s: точные цвета, нет мерцания
- [ ] Haptics: работает на всех поддерживаемых устройствах
- [ ] Notifications: приходят в фоне, тап открывает глубокую ссылку
- [ ] Offline: играть можно, сессии синкаются при онлайне
- [ ] Deep links: `kognitika://` и `https://kognitika.ru` открывают 앱
- [ ] Back gesture / hardware back: правильная навигация
- [ ] Keyboard: не перекрывает инпуты, resize работает
- [ ] Orientation: портретная блокировка (только для тренажёров)

---

## Play Store Release Checklist (Planned)

| Элемент | Статус |
|---|---|
| **Target SDK** | 34 (Android 14) |
| **Min SDK** | 26 (Android 8.0) |
| **64-bit (arm64-v8a, x86_64)** | ✅ |
| **App Bundle (AAB)** | ✅ |
| **Data Safety Form** | ⏸️ |
| **Privacy Policy URL** | ✅ (https://kognitika.ru/privacy) |
| **Content Rating** | ⏸️ (Everyone) |
| **Screenshots (Phone, 7-inch, 10-inch)** | ⏸️ |
| **Feature Graphic** | ⏸️ |
| **Release Notes (RU/EN)** | ⏸️ |
| **Internal Testing Track** | ⏸️ |
| **Closed Testing** | ⏸️ |
| **Production** | ⏸️ |

---

## Файлы и структура

```
android/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── res/
│   │   │   ├── values/strings.xml
│   │   │   ├── xml/network_security_config.xml
│   │   │   └── mipmap-*/ic_launcher*.png
│   │   └── java/ru/kognitika/MainActivity.kt
│   ├── build.gradle.kts
│   └── proguard-rules.pro
├── plugins/
│   ├── kognitika-analytics/
│   └── kognitika-haptics/
├── gradle/
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties

capacitor.config.ts
.github/workflows/android.yml (planned)
docs/
├── frame-budget-benchmark.md
├── pwa-offline-strategy.md
├── wasm-hotpath-benchmark.md
├── privacy-model.md
├── security-audit.md
└── play-store-checklist.md
```

---

## Команды

```bash
# Dev
pnpm cap sync
pnpm cap run android --target=<device_id>

# Build
pnpm build && pnpm cap sync android
cd android && ./gradlew assembleRelease

# Logs
adb logcat -s "Capacitor*" "Kognitika*" "chromium" "*WebView*"

# Inspect WebView
chrome://inspect/#devices
```
