# Справочник API

## Текущий статус OpenAPI

OpenAPI/Swagger поддержка запланирована в GitHub issue **#138**. Работа носит implementation-neutral характер: контракт, способ генерации, зависимости, UI и CI-интеграция ещё не утверждены и не реализованы как runtime-функция.

- `/api/docs` **не доступен**.
- `/api/docs.json` **не доступен**.
- В репозитории нет текущих команд `openapi:generate` или `openapi:serve`, подключённого Scalar UI, генератора спецификации либо опубликованной OpenAPI-схемы.
- API documentation routes не являются существующим ADMIN-protected surface.

Не используйте предполагаемые OpenAPI routes для интеграций или проверок доступности.

## Доступный источник правды

До реализации issue #138 проверяйте фактические HTTP-контракты по server routes, validation schemas и их тестам в основной ветке. Состояние production endpoint необходимо подтверждать отдельно через утверждённую deployment/health процедуру, а не по этой странице.

## Критерии будущей реализации

Перед публикацией OpenAPI-документации владельцу issue #138 необходимо определить и проверить:

1. источник и версионирование контрактов;
2. authentication и redaction policy для документации;
3. генерацию и CI validation;
4. доступность runtime routes и их deployment ownership;
5. отсутствие раскрытия секретов, raw Brain ID и private telemetry.
