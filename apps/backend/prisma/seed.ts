import { PrismaClient, ReminderType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ---- Admin inicial -------------------------------------------------------
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@farmacia.local';
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Administrador',
      email: adminEmail,
      password: await bcrypt.hash(adminPass, 10),
      role: UserRole.ADMIN,
    },
  });

  // ---- Templates padrão ----------------------------------------------------
  await prisma.messageTemplate.upsert({
    where: { key: 'advance_default' },
    update: {},
    create: {
      key: 'advance_default',
      name: 'Aviso antecipado (padrão)',
      type: ReminderType.ADVANCE,
      isDefault: true,
      body: [
        'Olá{{#cliente}} {{cliente}}{{/cliente}}! 😊',
        '',
        'Percebemos que seu medicamento {{medicamento}} deverá acabar em aproximadamente {{dias}} dias.',
        '',
        'Gostaria que já reservássemos uma nova unidade para você?',
      ].join('\n'),
    },
  });

  await prisma.messageTemplate.upsert({
    where: { key: 'final_day_default' },
    update: {},
    create: {
      key: 'final_day_default',
      name: 'Aviso no último dia (padrão)',
      type: ReminderType.FINAL_DAY,
      isDefault: true,
      body: [
        'Olá{{#cliente}} {{cliente}}{{/cliente}}!',
        '',
        'Seu tratamento com {{medicamento}} provavelmente chegou ao fim hoje.',
        '',
        'Caso deseje continuar o tratamento, podemos deixar sua reposição separada.',
        'Basta responder esta mensagem.',
      ].join('\n'),
    },
  });

  console.log('Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
