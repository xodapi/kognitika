import nodemailer from 'nodemailer';

const mailConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE !== 'false',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
};

export const transporter = nodemailer.createTransport(mailConfig);

export const sendMagicLinkEmail = async (email: string, magicToken: string, magicUrl: string) => {
  if (process.env.LEGACY_EMAIL_AUTH_ENABLED !== 'true') {
    throw new Error('Legacy email auth is disabled');
  }

  return transporter.sendMail({
    from: `"Kognitika Auth" <${mailConfig.auth.user}>`,
    to: email,
    subject: 'Ваша ссылка для входа в Kognitika',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">Вход в Kognitika</h2>
        <p>Нажмите на кнопку ниже, чтобы войти. Ссылка действительна 15 минут.</p>
        <form action="${magicUrl}" method="POST" style="display:inline;">
          <input type="hidden" name="token" value="${magicToken}" />
          <button type="submit" style="padding: 12px 24px; background: #3b82f6; color: #fff; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">
            Войти в Kognitika
          </button>
        </form>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          Если вы не запрашивали эту ссылку — просто проигнорируйте письмо.
        </p>
      </div>
    `
  });
};
