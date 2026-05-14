import { PrismaClient } from '@prisma/client';
import { generateBrainId, generatePseudonym } from '../utils/brain-id.ts';

const prisma = new PrismaClient();

async function migrate() {
  console.log('[Migration] Starting migration to Brain ID...');

  const users = await prisma.user.findMany({
    where: {
      brainId: null
    }
  });

  console.log(`[Migration] Found ${users.length} users to migrate.`);

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

    console.log(`[Migration] User ${user.email || user.id} -> ${pseudonym}`);
  }

  console.log('[Migration] Finished successfully.');
}

migrate()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
