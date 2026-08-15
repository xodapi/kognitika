import { ExternalLink, ShieldCheck } from 'lucide-react';

export function PrivacyNotice() {
  return (
    <section className="mx-auto w-full max-w-3xl py-6 sm:py-10">
      <div className="rounded-3xl border border-border bg-card/60 p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3 text-primary">
          <ShieldCheck className="h-7 w-7" />
          <p className="text-xs font-black uppercase tracking-[0.22em]">Kognitika</p>
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
          Приватность и cookies
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Последнее техническое уточнение: 12 августа 2026 года. Это краткое
          уведомление описывает работу приложения и не заменяет индивидуальную
          юридическую консультацию.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-6 text-muted-foreground">
          <section>
            <h2 className="text-base font-black text-foreground">Кто отвечает за сайт</h2>
            <p className="mt-2">
              Владелец: Богорад Сергей Борисович. По вопросам данных и удаления
              информации: <a className="font-bold text-primary hover:underline" href="mailto:sbb@bsosh3.org">sbb@bsosh3.org</a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-foreground">Какие данные использует приложение</h2>
            <p className="mt-2">
              При создании и использовании Brain ID могут обрабатываться псевдоним,
              идентификатор профиля, результаты и время тренировок, рейтинг, серия
              занятий, а также текст, который пользователь добровольно отправляет
              через обратную связь или идеи.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-foreground">Цели</h2>
            <p className="mt-2">
              Данные используются для входа, сохранения прогресса, работы тренажёров,
              безопасности и ответа на добровольно отправленную обратную связь.
              Платформа не использует рекламные cookies или поведенческую рекламу.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-foreground">Cookies и локальное хранилище</h2>
            <p className="mt-2">
              Для работы профиля браузер может хранить технические данные Brain ID,
              токен доступа и запись пользователя в localStorage. Они нужны для
              продолжения сеанса и не являются необязательной рекламной аналитикой.
              Их можно удалить средствами браузера, после чего потребуется войти
              или создать профиль заново.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-foreground">Внешние сервисы</h2>
            <p className="mt-2">
              На момент проверки на публичной странице не обнаружены активные Google
              Analytics, Яндекс.Метрика, рекламные пиксели или сторонние шрифты.
              Если в будущем будет включён добровольный экспорт данных во внешний
              сервис, пользователь должен увидеть получателя и подтвердить передачу
              до отправки.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-foreground">Подробнее</h2>
            <a
              className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
              href="https://github.com/xodapi/kognitika/blob/master/docs/privacy-data-processing-inventory.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              Технический реестр обработки данных
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </section>
        </div>
      </div>
    </section>
  );
}
