import { z } from 'zod';

export const magicLinkSchema = z.object({
  email: z.string().email('Некорректный email')
});

export const verifySchema = z.object({
  token: z.string().min(1, 'Токен обязателен')
});

export const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов')
});

export const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
  name: z.string().min(2, 'Имя должно быть не менее 2 символов')
});

export const resumeSchema = z.object({
  brainId: z.string().min(1, 'ID сессии обязателен')
});

