/**
 * Demo seed — creates:
 *   1. Teacher user       professor@planifica.ao / Professor123!
 *   2. Admin user         admin@planifica.ao     / Admin123!
 *   3. Ministerial school calendar Angola 2025/2026
 *
 * Idempotent: skips records that already exist (matched by email / unique key).
 * Run: npx tsx src/infrastructure/database/prisma/seed-demo.ts
 */

import { PrismaClient, UserRole, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 12;

// ─── helpers ──────────────────────────────────────────────────────────────────

function d(iso: string): Date {
  return new Date(iso);
}

// FREE subscriptions never expire — sentinel date matches the domain constant.
const FREE_SUBSCRIPTION_END = new Date('2099-12-31T23:59:59.000Z');

function freeSubscription(userId: string) {
  return {
    userId,
    plan: SubscriptionPlan.FREE,
    status: SubscriptionStatus.ACTIVE,
    startDate: new Date(),
    endDate: FREE_SUBSCRIPTION_END,
  };
}

// ─── 1. Users ─────────────────────────────────────────────────────────────────

async function seedTeacher() {
  const email = 'professor@planifica.ao';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`  ↳ teacher already exists (${email})`);
    return existing;
  }

  const password = await bcrypt.hash('Professor123!', SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      name: 'Ana Margarida Ferreira',
      password,
      emailVerified: true,
      onboardingCompleted: true,
      role: UserRole.TEACHER,
      school: 'Escola Secundária Ngola Kiluanje',
      subject: 'Matemática',
    },
  });

  await prisma.teacherProfile.create({
    data: {
      userId: user.id,
      schoolName: 'Escola Secundária Ngola Kiluanje',
      country: 'Angola',
      academicYear: '2025/2026',
      subjects: ['Matemática', 'Física'],
      classes: ['9ª Classe', '10ª Classe', '11ª Classe'],
      numberOfClasses: 3,
      teachingStyle: 'Expositivo com resolução de problemas práticos',
    },
  });

  await prisma.subscription.create({ data: freeSubscription(user.id) });

  console.log(`  ✓ teacher created: ${email}`);
  return user;
}

async function seedAdmin() {
  const email = 'admin@planifica.ao';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`  ↳ admin already exists (${email})`);
    return existing;
  }

  const password = await bcrypt.hash('Admin123!', SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      name: 'Carlos Alberto Santos',
      password,
      emailVerified: true,
      onboardingCompleted: true,
      role: UserRole.ADMIN,
    },
  });

  await prisma.subscription.create({ data: freeSubscription(user.id) });

  console.log(`  ✓ admin created: ${email}`);
  return user;
}

// ─── 2. Ministerial Calendar Angola 2025/2026 ─────────────────────────────────
//
// Angola academic year 2025/2026
//   1.º Trimestre  02 Fev – 18 Abr 2026  (10 semanas lectivas)
//   Interrupção    19 Abr – 03 Mai 2026  (Páscoa / férias)
//   2.º Trimestre  04 Mai – 01 Ago 2026  (12 semanas lectivas)
//   Interrupção    02 Ago – 23 Ago 2026  (férias de Agosto)
//   3.º Trimestre  24 Ago – 04 Dez 2026  (14 semanas lectivas)

async function seedMinisterialCalendar(adminId: string) {
  // Unique key: type + schoolId + academicYear  (schoolId = null for MINISTERIAL)
  const existing = await prisma.schoolCalendar.findFirst({
    where: { type: 'MINISTERIAL', schoolId: null, academicYear: '2025/2026' },
  });
  if (existing) {
    console.log('  ↳ ministerial calendar already exists');
    return existing;
  }

  const calendar = await prisma.schoolCalendar.create({
    data: {
      userId: adminId,
      academicYear: '2025/2026',
      country: 'Angola',
      schoolName: null,
      type: 'MINISTERIAL',
      schoolId: null,
      isActive: true,
      version: 1,
      startDate: d('2026-02-02'),
      endDate: d('2026-12-04'),

      // ── Terms ─────────────────────────────────────────────────────────────
      terms: {
        create: [
          {
            name: '1.º Trimestre',
            trimester: 1,
            startDate: d('2026-02-02'),
            endDate: d('2026-04-18'),
            teachingWeeks: 10,
          },
          {
            name: '2.º Trimestre',
            trimester: 2,
            startDate: d('2026-05-04'),
            endDate: d('2026-08-01'),
            teachingWeeks: 12,
          },
          {
            name: '3.º Trimestre',
            trimester: 3,
            startDate: d('2026-08-24'),
            endDate: d('2026-12-04'),
            teachingWeeks: 14,
          },
        ],
      },

      // ── Events ────────────────────────────────────────────────────────────
      events: {
        create: [
          // ── Feriados Nacionais ─────────────────────────────────────────────
          {
            title: '4 de Fevereiro — Início da Luta Armada de Libertação Nacional',
            type: 'NATIONAL_HOLIDAY',
            startDate: d('2026-02-04'),
            endDate: d('2026-02-04'),
            color: '#DC2626',
            allDay: true,
          },
          {
            title: '8 de Março — Dia Internacional da Mulher',
            type: 'NATIONAL_HOLIDAY',
            startDate: d('2026-03-08'),
            endDate: d('2026-03-08'),
            color: '#DC2626',
            allDay: true,
          },
          {
            title: '4 de Abril — Dia da Paz e Reconciliação Nacional',
            type: 'NATIONAL_HOLIDAY',
            startDate: d('2026-04-04'),
            endDate: d('2026-04-04'),
            color: '#DC2626',
            allDay: true,
          },
          {
            title: '1 de Maio — Dia do Trabalhador',
            type: 'NATIONAL_HOLIDAY',
            startDate: d('2026-05-01'),
            endDate: d('2026-05-01'),
            color: '#DC2626',
            allDay: true,
          },
          {
            title: '25 de Maio — Dia de África',
            type: 'NATIONAL_HOLIDAY',
            startDate: d('2026-05-25'),
            endDate: d('2026-05-25'),
            color: '#DC2626',
            allDay: true,
          },
          {
            title: '1 de Junho — Dia Internacional da Criança',
            type: 'NATIONAL_HOLIDAY',
            startDate: d('2026-06-01'),
            endDate: d('2026-06-01'),
            color: '#DC2626',
            allDay: true,
          },
          {
            title: '17 de Setembro — Fundação do MPLA / Dia dos Heróis Nacionais',
            type: 'NATIONAL_HOLIDAY',
            startDate: d('2026-09-17'),
            endDate: d('2026-09-17'),
            color: '#DC2626',
            allDay: true,
          },
          {
            title: '2 de Novembro — Dia dos Finados',
            type: 'NATIONAL_HOLIDAY',
            startDate: d('2026-11-02'),
            endDate: d('2026-11-02'),
            color: '#DC2626',
            allDay: true,
          },
          {
            title: '11 de Novembro — Dia da Independência Nacional',
            type: 'NATIONAL_HOLIDAY',
            startDate: d('2026-11-11'),
            endDate: d('2026-11-11'),
            color: '#DC2626',
            allDay: true,
          },

          // ── Interrupções Lectivas ──────────────────────────────────────────
          {
            title: 'Interrupção Lectiva — Páscoa (fim do 1.º trimestre)',
            type: 'TRIMESTER_BREAK',
            startDate: d('2026-04-19'),
            endDate: d('2026-05-03'),
            color: '#F59E0B',
            allDay: true,
          },
          {
            title: 'Interrupção Lectiva — Agosto (fim do 2.º trimestre)',
            type: 'TRIMESTER_BREAK',
            startDate: d('2026-08-02'),
            endDate: d('2026-08-23'),
            color: '#F59E0B',
            allDay: true,
          },

          // ── Épocas de Exames ───────────────────────────────────────────────
          {
            title: 'Exames do 1.º Trimestre',
            type: 'EXAM_PERIOD',
            startDate: d('2026-04-13'),
            endDate: d('2026-04-18'),
            color: '#7C3AED',
            allDay: true,
          },
          {
            title: 'Exames do 2.º Trimestre',
            type: 'EXAM_PERIOD',
            startDate: d('2026-07-27'),
            endDate: d('2026-08-01'),
            color: '#7C3AED',
            allDay: true,
          },
          {
            title: 'Exames do 3.º Trimestre',
            type: 'EXAM_PERIOD',
            startDate: d('2026-11-23'),
            endDate: d('2026-12-04'),
            color: '#7C3AED',
            allDay: true,
          },

          // ── Exames de Recurso ──────────────────────────────────────────────
          {
            title: 'Exames de Recurso — 1.ª Época',
            type: 'MAKEUP_EXAM',
            startDate: d('2026-12-07'),
            endDate: d('2026-12-18'),
            color: '#0891B2',
            allDay: true,
          },

          // ── Actividades Pedagógicas ────────────────────────────────────────
          {
            title: 'Abertura do Ano Lectivo 2025/2026',
            type: 'PEDAGOGICAL_ACTIVITY',
            startDate: d('2026-02-02'),
            endDate: d('2026-02-02'),
            color: '#16A34A',
            allDay: true,
          },
          {
            title: 'Reunião Pedagógica de Início do 2.º Trimestre',
            type: 'PEDAGOGICAL_ACTIVITY',
            startDate: d('2026-05-04'),
            endDate: d('2026-05-04'),
            color: '#16A34A',
            allDay: true,
          },
          {
            title: 'Reunião Pedagógica de Início do 3.º Trimestre',
            type: 'PEDAGOGICAL_ACTIVITY',
            startDate: d('2026-08-24'),
            endDate: d('2026-08-24'),
            color: '#16A34A',
            allDay: true,
          },
          {
            title: 'Encerramento do Ano Lectivo 2025/2026',
            type: 'PEDAGOGICAL_ACTIVITY',
            startDate: d('2026-12-04'),
            endDate: d('2026-12-04'),
            color: '#16A34A',
            allDay: true,
          },
        ],
      },
    },
  });

  console.log(`  ✓ ministerial calendar created: Angola ${calendar.academicYear}`);
  console.log(`    Terms: 3  |  Events: 18`);
  return calendar;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n── Demo Seed ──────────────────────────────────────────────────');

  console.log('\n[1/3] Users');
  const teacher = await seedTeacher();
  const admin = await seedAdmin();

  console.log('\n[2/3] Ministerial Calendar');
  await seedMinisterialCalendar(admin.id);

  console.log('\n[3/3] Selecting calendar for teacher (if none selected)');
  const updatedTeacher = await prisma.user.findUnique({ where: { id: teacher.id } });
  if (!updatedTeacher?.selectedCalendarId) {
    const cal = await prisma.schoolCalendar.findFirst({
      where: { type: 'MINISTERIAL', academicYear: '2025/2026' },
    });
    if (cal) {
      await prisma.user.update({
        where: { id: teacher.id },
        data: { selectedCalendarId: cal.id },
      });
      console.log(`  ✓ teacher's selected calendar set to: ${cal.academicYear}`);
    }
  } else {
    console.log('  ↳ teacher already has a selected calendar');
  }

  console.log('\n── Done ───────────────────────────────────────────────────────');
  console.log('\nDemo credentials:');
  console.log('  Professor  →  professor@planifica.ao  /  Professor123!');
  console.log('  Admin      →  admin@planifica.ao      /  Admin123!');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
