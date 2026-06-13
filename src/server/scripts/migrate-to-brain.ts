import prisma from '../../lib/prisma.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import { generateBrainId, generatePseudonym } from '../utils/brain-id.ts';

const logger = createSafeLogger('migrate-to-brain');

async function migrate() {
  logger.info('Starting Brain ID migration');

  const users = await prisma.user.findMany({
    where: {
      brainId: null
    }
  });

  logger.info('Users queued for Brain ID migration', { count: users.length });

  for (const user of users) {
    const brainId = generateBrainId();
    const pseudonym = generatePseudonym(brainId);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        brainId,
        pseudonym,
        // Мы НЕ удаляем email автоматически в скрипте, чтобы не ломать вход пользователям.
        // Переход на полную анонимность должен инициировать сам пользователь в UI.
      }
    });

    logger.info('User migrated to Brain ID', { userLabel: `User ${user.id.slice(0, 8)}`, pseudonym });
  }

  logger.info('Brain ID migration finished successfully');
}

migrate()
  .catch(e => {
    logger.error('Brain ID migration failed', { error: safeError(e) });
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
