/**
 * Seed script: Creates ministerial + school calendars for testing.
 *
 * Usage:
 *   npx tsx scripts/seed-calendars.ts
 */

import { PrismaClient, CalendarType, CalendarEventType } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { config } from 'dotenv';

config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function angolaEvents(startYear: number, endYear: number) {
  return [
    { title: 'Ano Novo', startDate: new Date(Date.UTC(endYear, 0, 1)), endDate: new Date(Date.UTC(endYear, 0, 1)), type: CalendarEventType.NATIONAL_HOLIDAY },
    { title: 'Mártires da Repressão Colonial', startDate: new Date(Date.UTC(endYear, 0, 4)), endDate: new Date(Date.UTC(endYear, 0, 4)), type: CalendarEventType.NATIONAL_HOLIDAY },
    { title: 'Início da Luta Armada', startDate: new Date(Date.UTC(endYear, 1, 4)), endDate: new Date(Date.UTC(endYear, 1, 4)), type: CalendarEventType.NATIONAL_HOLIDAY },
    { title: 'Dia Internacional da Mulher', startDate: new Date(Date.UTC(endYear, 2, 8)), endDate: new Date(Date.UTC(endYear, 2, 8)), type: CalendarEventType.NATIONAL_HOLIDAY },
    { title: 'Dia da Paz e Reconciliação', startDate: new Date(Date.UTC(endYear, 3, 4)), endDate: new Date(Date.UTC(endYear, 3, 4)), type: CalendarEventType.NATIONAL_HOLIDAY },
    { title: 'Dia do Trabalhador', startDate: new Date(Date.UTC(endYear, 4, 1)), endDate: new Date(Date.UTC(endYear, 4, 1)), type: CalendarEventType.NATIONAL_HOLIDAY },
    { title: 'Dia da Independência', startDate: new Date(Date.UTC(startYear, 10, 11)), endDate: new Date(Date.UTC(startYear, 10, 11)), type: CalendarEventType.NATIONAL_HOLIDAY },
    { title: 'Natal', startDate: new Date(Date.UTC(startYear, 11, 25)), endDate: new Date(Date.UTC(startYear, 11, 25)), type: CalendarEventType.NATIONAL_HOLIDAY },
    // Breaks
    { title: 'Férias de Natal', startDate: new Date(Date.UTC(startYear, 11, 16)), endDate: new Date(Date.UTC(endYear, 0, 3)), type: CalendarEventType.TRIMESTER_BREAK },
    { title: 'Férias da Páscoa', startDate: new Date(Date.UTC(endYear, 2, 29)), endDate: new Date(Date.UTC(endYear, 3, 6)), type: CalendarEventType.TRIMESTER_BREAK },
    // Exams
    { title: 'Avaliação 1º Trimestre', startDate: new Date(Date.UTC(startYear, 11, 1)), endDate: new Date(Date.UTC(startYear, 11, 13)), type: CalendarEventType.EXAM_PERIOD },
    { title: 'Avaliação 2º Trimestre', startDate: new Date(Date.UTC(endYear, 2, 17)), endDate: new Date(Date.UTC(endYear, 2, 28)), type: CalendarEventType.EXAM_PERIOD },
    { title: 'Avaliação 3º Trimestre', startDate: new Date(Date.UTC(endYear, 6, 1)), endDate: new Date(Date.UTC(endYear, 6, 11)), type: CalendarEventType.EXAM_PERIOD },
    // Pedagogical
    { title: 'Jornada Pedagógica de Abertura', startDate: new Date(Date.UTC(startYear, 7, 26)), endDate: new Date(Date.UTC(startYear, 7, 30)), type: CalendarEventType.PEDAGOGICAL_ACTIVITY },
    // School events
    { title: 'Dia do Professor', startDate: new Date(Date.UTC(startYear, 9, 5)), endDate: new Date(Date.UTC(startYear, 9, 5)), type: CalendarEventType.SCHOOL_EVENT },
  ];
}

function terms(academicYear: string, startYear: number, endYear: number) {
  return [
    { name: `1º Trimestre ${academicYear}`, trimester: 1, startDate: new Date(Date.UTC(startYear, 8, 1)), endDate: new Date(Date.UTC(startYear, 11, 13)), teachingWeeks: 14 },
    { name: `2º Trimestre ${academicYear}`, trimester: 2, startDate: new Date(Date.UTC(endYear, 0, 6)), endDate: new Date(Date.UTC(endYear, 2, 28)), teachingWeeks: 12 },
    { name: `3º Trimestre ${academicYear}`, trimester: 3, startDate: new Date(Date.UTC(endYear, 3, 7)), endDate: new Date(Date.UTC(endYear, 6, 18)), teachingWeeks: 14 },
  ];
}

async function createCalendar(opts: {
  userId: string;
  academicYear: string;
  type: CalendarType;
  schoolName?: string;
  schoolId?: string;
  extraEvents?: { title: string; startDate: Date; endDate: Date; type: CalendarEventType }[];
}) {
  const [startYearStr, endYearStr] = opts.academicYear.split('/');
  const startYear = parseInt(startYearStr, 10);
  const endYear = parseInt(endYearStr, 10);

  const baseEvents = angolaEvents(startYear, endYear);
  const allEvents = [...baseEvents, ...(opts.extraEvents || [])];
  const allTerms = terms(opts.academicYear, startYear, endYear);

  return prisma.schoolCalendar.create({
    data: {
      userId: opts.userId,
      academicYear: opts.academicYear,
      country: 'Angola',
      type: opts.type,
      schoolName: opts.schoolName,
      schoolId: opts.schoolId,
      isActive: true,
      version: 1,
      startDate: new Date(Date.UTC(startYear, 8, 1)),
      endDate: new Date(Date.UTC(endYear, 6, 18)),
      terms: { create: allTerms },
      events: { create: allEvents.map(e => ({ ...e, allDay: true })) },
    },
    include: { terms: true, events: true },
  });
}

async function main() {
  const academicYear = '2025/2026';
  const [sy, ey] = [2025, 2026];

  // Find admin
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } });
  if (!admin) {
    console.error('No ADMIN user found. Create one first.');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`\nAdmin: ${admin.email}`);
  console.log(`Academic year: ${academicYear}\n`);

  // 1. Ministerial calendar for 2025/2026
  const existingMin = await prisma.schoolCalendar.findFirst({
    where: { type: 'MINISTERIAL', academicYear, isActive: true },
  });

  if (existingMin) {
    console.log(`[SKIP] Ministerial ${academicYear} already exists (${existingMin.id})`);
  } else {
    const min = await createCalendar({
      userId: admin.id,
      academicYear,
      type: CalendarType.MINISTERIAL,
    });
    console.log(`[OK] Ministerial ${academicYear} created (${min.id}) — ${min.terms.length} terms, ${min.events.length} events`);
  }

  // 2. School-specific calendar: "Escola Secundária de Viana"
  const schoolName = 'Escola Secundária de Viana';
  const schoolId = 'escola-viana-001';

  const existingSchool = await prisma.schoolCalendar.findFirst({
    where: { type: 'SCHOOL', schoolId, academicYear },
  });

  if (existingSchool) {
    console.log(`[SKIP] School "${schoolName}" ${academicYear} already exists (${existingSchool.id})`);
  } else {
    const school = await createCalendar({
      userId: admin.id,
      academicYear,
      type: CalendarType.SCHOOL,
      schoolName,
      schoolId,
      extraEvents: [
        // School-specific events not in the ministerial calendar
        { title: 'Aniversário da Escola', startDate: new Date(Date.UTC(sy, 9, 15)), endDate: new Date(Date.UTC(sy, 9, 15)), type: CalendarEventType.SCHOOL_EVENT },
        { title: 'Feira de Ciências', startDate: new Date(Date.UTC(ey, 4, 20)), endDate: new Date(Date.UTC(ey, 4, 21)), type: CalendarEventType.SCHOOL_EVENT },
        { title: 'Dia Desportivo Escolar', startDate: new Date(Date.UTC(ey, 5, 5)), endDate: new Date(Date.UTC(ey, 5, 5)), type: CalendarEventType.SCHOOL_EVENT },
      ],
    });
    console.log(`[OK] School "${schoolName}" ${academicYear} created (${school.id}) — ${school.terms.length} terms, ${school.events.length} events`);
  }

  // 3. Also ensure ministerial exists for 2026/2027 (already created earlier)
  const existingMin2 = await prisma.schoolCalendar.findFirst({
    where: { type: 'MINISTERIAL', academicYear: '2026/2027', isActive: true },
  });
  if (existingMin2) {
    console.log(`[OK] Ministerial 2026/2027 already exists (${existingMin2.id})`);
  }

  // 4. School calendar for 2026/2027 too
  const existingSchool2 = await prisma.schoolCalendar.findFirst({
    where: { type: 'SCHOOL', schoolId, academicYear: '2026/2027' },
  });

  if (existingSchool2) {
    console.log(`[SKIP] School "${schoolName}" 2026/2027 already exists (${existingSchool2.id})`);
  } else {
    // Need a different userId for 2026/2027 due to @@unique([userId, academicYear])
    // Find another user or use the teacher user
    const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' }, orderBy: { createdAt: 'asc' } });
    const ownerId = teacher?.id || admin.id;

    try {
      const school2 = await createCalendar({
        userId: ownerId,
        academicYear: '2026/2027',
        type: CalendarType.SCHOOL,
        schoolName,
        schoolId,
        extraEvents: [
          { title: 'Aniversário da Escola', startDate: new Date(Date.UTC(2026, 9, 15)), endDate: new Date(Date.UTC(2026, 9, 15)), type: CalendarEventType.SCHOOL_EVENT },
          { title: 'Feira de Ciências', startDate: new Date(Date.UTC(2027, 4, 20)), endDate: new Date(Date.UTC(2027, 4, 21)), type: CalendarEventType.SCHOOL_EVENT },
          { title: 'Dia Desportivo Escolar', startDate: new Date(Date.UTC(2027, 5, 5)), endDate: new Date(Date.UTC(2027, 5, 5)), type: CalendarEventType.SCHOOL_EVENT },
        ],
      });
      console.log(`[OK] School "${schoolName}" 2026/2027 created (${school2.id}) — ${school2.terms.length} terms, ${school2.events.length} events`);
    } catch (err) {
      console.log(`[SKIP] School 2026/2027 — ${err instanceof Error ? err.message : 'already exists'}`);
    }
  }

  console.log('\nDone! Calendars available for selection in onboarding.\n');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
