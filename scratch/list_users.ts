import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { rating: 'desc' },
    select: {
      name: true,
      email: true,
      rating: true,
      level: true,
      experience: true
    }
  });

  console.log('--- USER LIST ---');
  console.table(users);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
