import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const achievements = await prisma.achievement.findMany();
  console.log(JSON.stringify(achievements, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
