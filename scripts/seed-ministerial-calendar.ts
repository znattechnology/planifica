/**
 * Seed script: Creates the ministerial calendar for a given academic year.
 *
 * Usage:
 *   npx tsx scripts/seed-ministerial-calendar.ts [academicYear]
 *
 * Examples:
 *   npx tsx scripts/seed-ministerial-calendar.ts 2026/2027
 *   npx tsx scripts/seed-ministerial-calendar.ts          # defaults to current year
 */

import { PrismaClient, CalendarEventType } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { config } from 'dotenv';

config(); // Load .env

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Inline the template generation to avoid import issues with path aliases
function generateAngolaCalendarData(academicYear: string) {
  const [startYearStr, endYearStr] = academicYear.split('/');
  const startYear = parseInt(startYearStr, 10);
  const endYear = parseInt(endYearStr, 10);

  const startDate = new Date(Date.UTC(startYear, 8, 1));   // Sep 1
  const endDate = new Date(Date.UTC(endYear, 6, 18));       // Jul 18

  // Terms
  const terms = [
    {
      name: `1º Trimestre ${academicYear}`,
      trimester: 1,
      startDate: new Date(Date.UTC(startYear, 8, 1)),       // Sep 1
      endDate: new Date(Date.UTC(startYear, 11, 13)),        // Dec 13
      teachingWeeks: 14,
    },
    {
      name: `2º Trimestre ${academicYear}`,
      trimester: 2,
      startDate: new Date(Date.UTC(endYear, 0, 6)),          // Jan 6
      endDate: new Date(Date.UTC(endYear, 2, 28)),           // Mar 28
      teachingWeeks: 12,
    },
    {
      name: `3º Trimestre ${academicYear}`,
      trimester: 3,
      startDate: new Date(Date.UTC(endYear, 3, 7)),          // Apr 7
      endDate: new Date(Date.UTC(endYear, 6, 18)),           // Jul 18
      teachingWeeks: 14,
    },
  ];

  // Events
  const events: { title: string; startDate: Date; endDate: Date; type: CalendarEventType }[] = [
    // National holidays
    { title: 'Ano Novo', startDate: new Date(Date.UTC(endYear, 0, 1)), endDate: new Date(Date.UTC(endYear, 0, 1)), type: CalendarEventType.NATIONAL_HOLIDAY },
    { title: 'Mártires da Repressão Colonial', startDate: new Date(Date.UTC(endYear, 0, 4)), endDate: new Date(Date.UTC(endYear, 0, 4)), type: CalendarEventType.NATIONAL_HOLIDAY },
    { title: 'Início da Luta Armada', startDate: new Date(Date.UTC(endYear, 1, 4)), endDate: new Date(Date.UTC(endYear, 1, 4)), type: CalendarEventType.NATIONAL_HOLIDAY },
    { title: 'Dia Internacional da Mulher', startDate: new Date(Date.UTC(endYear, 2, 8)), endDate: new Date(Date.UTC(endYear, 2, 8)), type: CalendarEventType.NATIONAL_HOLIDAY },
    { title: 'Dia da Paz e Reconciliação Nacional', startDate: new Date(Date.UTC(endYear, 3, 4)), endDate: new Date(Date.UTC(endYear, 3, 4)), type: CalendarEventType.NATIONAL_HOLIDAY },
    { title: 'Dia Internacional do Trabalhador', startDate: new Date(Date.UTC(endYear, 4, 1)), endDate: new Date(Date.UTC(endYear, 4, 1)), type: CalendarEventType.NATIONAL_HOLIDAY },
    { title: 'Dia da Independência', startDate: new Date(Date.UTC(startYear, 10, 11)), endDate: new Date(Date.UTC(startYear, 10, 11)), type: CalendarEventType.NATIONAL_HOLIDAY },
    { title: 'Natal', startDate: new Date(Date.UTC(startYear, 11, 25)), endDate: new Date(Date.UTC(startYear, 11, 25)), type: CalendarEventType.NATIONAL_HOLIDAY },
    // Trimester breaks
    { title: 'Férias de Natal', startDate: new Date(Date.UTC(startYear, 11, 16)), endDate: new Date(Date.UTC(endYear, 0, 3)), type: CalendarEventType.TRIMESTER_BREAK },
    { title: 'Férias da Páscoa', startDate: new Date(Date.UTC(endYear, 2, 29)), endDate: new Date(Date.UTC(endYear, 3, 6)), type: CalendarEventType.TRIMESTER_BREAK },
    // Exam periods
    { title: 'Avaliação 1º Trimestre', startDate: new Date(Date.UTC(startYear, 11, 1)), endDate: new Date(Date.UTC(startYear, 11, 13)), type: CalendarEventType.EXAM_PERIOD },
    { title: 'Avaliação 2º Trimestre', startDate: new Date(Date.UTC(endYear, 2, 17)), endDate: new Date(Date.UTC(endYear, 2, 28)), type: CalendarEventType.EXAM_PERIOD },
    { title: 'Avaliação 3º Trimestre', startDate: new Date(Date.UTC(endYear, 6, 1)), endDate: new Date(Date.UTC(endYear, 6, 11)), type: CalendarEventType.EXAM_PERIOD },
    // Pedagogical activities
    { title: 'Jornada Pedagógica de Abertura', startDate: new Date(Date.UTC(startYear, 7, 26)), endDate: new Date(Date.UTC(startYear, 7, 30)), type: CalendarEventType.PEDAGOGICAL_ACTIVITY },
    { title: 'Jornada Pedagógica 2º Trimestre', startDate: new Date(Date.UTC(endYear, 0, 3)), endDate: new Date(Date.UTC(endYear, 0, 5)), type: CalendarEventType.PEDAGOGICAL_ACTIVITY },
    // School events
    { title: 'Dia do Professor', startDate: new Date(Date.UTC(startYear, 9, 5)), endDate: new Date(Date.UTC(startYear, 9, 5)), type: CalendarEventType.SCHOOL_EVENT },
    { title: 'Dia da Criança Africana', startDate: new Date(Date.UTC(endYear, 5, 16)), endDate: new Date(Date.UTC(endYear, 5, 16)), type: CalendarEventType.SCHOOL_EVENT },
  ];

  return { startDate, endDate, terms, events };
}

async function main() {
  const academicYear = process.argv[2] || '2026/2027';

  console.log(`\nCreating ministerial calendar for ${academicYear}...`);

  // Check if one already exists
  const existing = await prisma.schoolCalendar.findFirst({
    where: { type: 'MINISTERIAL', academicYear, isActive: true },
  });

  if (existing) {
    console.log(`Ministerial calendar for ${academicYear} already exists (id: ${existing.id})`);
    await prisma.$disconnect();
    return;
  }

  // Find an admin user to be the owner, or use the first user
  let owner = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!owner) {
    owner = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  }

  if (!owner) {
    console.error('No users found in database. Create a user first.');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`Owner: ${owner.email} (${owner.role})`);

  const data = generateAngolaCalendarData(academicYear);

  const calendar = await prisma.schoolCalendar.create({
    data: {
      userId: owner.id,
      academicYear,
      country: 'Angola',
      type: 'MINISTERIAL',
      isActive: true,
      version: 1,
      startDate: data.startDate,
      endDate: data.endDate,
      terms: {
        create: data.terms.map(t => ({
          name: t.name,
          trimester: t.trimester,
          startDate: t.startDate,
          endDate: t.endDate,
          teachingWeeks: t.teachingWeeks,
        })),
      },
      events: {
        create: data.events.map(e => ({
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate,
          type: e.type,
          allDay: true,
        })),
      },
    },
    include: {
      terms: true,
      events: true,
    },
  });

  console.log(`\nMinisterial calendar created successfully!`);
  console.log(`  ID: ${calendar.id}`);
  console.log(`  Year: ${academicYear}`);
  console.log(`  Terms: ${(calendar as unknown as { terms: unknown[] }).terms.length}`);
  console.log(`  Events: ${(calendar as unknown as { events: unknown[] }).events.length}`);
  console.log(`  Period: ${data.startDate.toISOString().split('T')[0]} → ${data.endDate.toISOString().split('T')[0]}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
