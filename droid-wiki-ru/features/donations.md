# Поддержка проекта (Donations)

**Маршрут**: `/donate` (кнопка в хедере/профиле) · **Компонент**: `DonateButton` → `DonateModal` · **Домен**: Устойчивое развитие · Прозрачность

---

## Назначение

**Donate** — freiwillное финансовое поддержание проекта пользователями. Без рекламы, без трекеров, без продажи данных. 100% средств идут на инфраструктуру и разработку.

---

## Принципы

| Принцип | Реализация |
|---|---|
| **Прозрачность** | Ежемесячный публичный отчёт: доходы / расходы / баланс |
| **Нет давления** | Кнопка не модальна, не блокирует функционал, не спамит |
| **Приватность** | Нет обязательной авторизации для доната, нет передачи данных третьим лицам |
| **Целевое использование** | Только серверы, домены, CI/CD, разработка новых модулей |

---

## Способы поддержки

### 1. GitHub Sponsors (основной)
- **URL**: https://github.com/sponsors/xodapi
- **Tier 1**: ☕ Кофе — $3/мес
- **Tier 2**: 🧠 Нейрон — $10/мес (бейдж в профиле)
- **Tier 3**: 🌟 Синапс — $25/мес (ранний доступ к фичам, голосование за roadmap)
- **Tier 4**: 🏛️ Архитектор — $100/мес (вклад в Credits, приоритетный саппорт)

### 2. Криптовалюта
| Сеть | Адрес | QR |
|---|---|---|
| **BTC (Lightning)** | `lnbc...` | ✅ |
| **ETH / USDT (ERC-20)** | `0x...` | ✅ |
| **TON** | `UQ...` | ✅ |
| **SOL** | `...` | ✅ |

### 3. Банковские карты (через сервисы)
- **Tinkoff / СБП** — по номеру телефона (в модалке)
- **ЮMoney** — `41001...`
- **Boosty** — https://boosty.to/kognitika

---

## UI: DonateButton / DonateModal

### Кнопка в хедере (DonateButton)
```tsx
<DonateButton />
```
- **Визуал**: 💜 Сердечко + «Поддержать»
- **Позиция**: Хедер (справа от профиля), футер Dashboard, модалка после стрика 30 дней
- **Состояние**: `default` / `hover` (пульсация) / `loading` (после клика)

### Модалка (DonateModal)
```
┌─────────────────────────────────────┐
│  ❤️  Поддержать Когнитику           │
│                                     │
│  Проект бесплатен, без рекламы и    │
│  трекеров. Твоя поддержка оплачивает│
│  серверы, домены и разработку.      │
│                                     │
│  📊 Прозрачный отчёт за июль 2026:  │
│  Доходы: $247  |  Расходы: $180     │
│  Серверы: $120  |  Домены: $15      │
│  CI/CD: $25  |  Резерв: $87        │
│                                     │
│  [ GitHub Sponsors  ]  [ BTC ]  [ ETH ]  [ TON ]│
│                                     │
│  Сумма: [ 100  ] ₽  [ Отправить ]   │
│                                     │
│  ☐ Анонимно (без псевдонима в списке)│
│                                     │
│  [ Закрыть ]                        │
└─────────────────────────────────────┘
```

---

## Прозрачность (Public Ledger)

### Ежемесячный отчёт (авто-публикация в Ideas Wall + GitHub Discussions)
```markdown
## 📊 Отчёт за июль 2026

**Доходы**: $247
- GitHub Sponsors: $180 (12 спонсоров)
- Крипта: $47
- Boosty: $20

**Расходы**: $180
- Hetzner CX42 (API + DB): $120
- Cloudflare Pro (DDoS, CDN): $25
- Домены (kognitika.ru, .com): $15
- GitHub Actions (премиум минуты): $20

**Баланс**: +$67 → Резервный фонд ($87 накоплено)

**Планы на август**:
- Новый модуль: "Архитектура диалога" (в разработке)
- Оптимизация WASM bundle (-30% size)
- Android release build (Play Console)
```

### Google Sheet (публичный, read-only)
- Ссылка в профиле проекта / DonateModal
- Колонки: Date, Source, Amount USD, Category, Notes

---

## Бейджи и признание

| Условие | Признание |
|---|---|
| **Активный спонсор** (любой tier) | 💜 Бейдж в профиле, в лидерборде, в чате |
| **Tier 3+ (3 мес.)** | 🌟 Звёздочка рядом с псевдонимом |
| **Tier 4 (6 мес.)** | 🏛️ В Credits (About / Footer), приоритетные фичи |
| **Одноразовый > $50** | 🎁 Спасибо-пост в SymbolChat (анонимно/с именем) |

---

## API

```typescript
// GET /api/donate/tiers (public)
// Response
{
  "tiers": [
    { "id": "coffee", "name": "Кофе", "amount": 3, "currency": "USD", "perks": ["Бейдж"] },
    { "id": "neuron", "name": "Нейрон", "amount": 10, "currency": "USD", "perks": ["Бейдж", "Early access"] },
    { "id": "synapse", "name": "Синапс", "amount": 25, "currency": "USD", "perks": ["Бейдж", "Early access", "Roadmap vote"] },
    { "id": "architect", "name": "Архитектор", "amount": 100, "currency": "USD", "perks": ["Credits", "Priority support"] }
  ],
  "crypto": { "btc": "lnbc...", "eth": "0x...", "ton": "UQ...", "sol": "..." },
  "transparentReportUrl": "https://docs.google.com/spreadsheets/d/...",
  "monthlyReport": { "income": 247, "expenses": 180, "breakdown": [...] }
}

// POST /api/donate/notify (webhook от GitHub Sponsors / Crypto processor)
// Body: { sponsorId, tier, amount, isRecurring, message? }
// Internal: assign badge, send thank you, update public ledger
```

---

## Безопасность и комплаенс

| Мера | Детали |
|---|---|
| **PCI DSS** | Платежи только через провайдеров (GitHub, Stripe, Crypto processors) — карточные данные не касаются нашего бэкенда |
| **AML/KYC** | Криптоплатежи через процессоры с compliance (Coinbase Commerce, NOWPayments) |
| **Нет хранения ПД** | Не сохраняем email/имя плательщика без согласия |
| **Refund policy** | Возврат за последний месяц спонсорства (GitHub policy) + 14 дней на разовые |

---

## Страницы на сайте

| Страница | URL | Компонент |
|---|---|---|
| **Поддержать** | https://kognitika.ru/donate (модалка) | `DonateButton` → `DonateModal` |
| **Прозрачность** | https://kognitika.ru/transparency | `TransparencyPage` (планируется) |

---

## Компоненты и файлы

| Путь | Назначение |
|---|---|
| `src/components/DonateButton.tsx` | Кнопка в хедере/футере |
| `src/components/DonateModal.tsx` | Модалка с тирами, криптой, отчётом |
| `src/components/DonateTier.tsx` | Карточка тира (GitHub Sponsors embed) |
| `src/hooks/useDonate.ts` | Состояние модалки, вебхуки, баджи |
| `src/server/routes/donate.ts` | REST: tiers, notify webhook, transparency report |
| `src/server/services/donate-service.ts` | Начисление баджей, синхронизация со спонсорами |
| `src/lib/donate-config.ts` | Конфиг: тиры, крипта-адреса, ссылки на отчёты |
