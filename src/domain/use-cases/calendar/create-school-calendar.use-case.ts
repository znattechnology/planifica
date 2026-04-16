import { ISchoolCalendarRepository } from '@/src/domain/interfaces/repositories/school-calendar.repository';
import { SchoolCalendar, CalendarType } from '@/src/domain/entities/school-calendar.entity';
import { generateAngolaCalendar } from '@/src/domain/services/angola-calendar.template';
import { ValidationError } from '@/src/domain/errors/domain.error';

export interface CreateCalendarInput {
  academicYear: string;
  country?: string;
  schoolName?: string;
  type?: CalendarType;
  schoolId?: string;
}

export class CreateSchoolCalendarUseCase {
  constructor(
    private readonly calendarRepository: ISchoolCalendarRepository,
  ) {}

  async execute(userId: string, input: CreateCalendarInput): Promise<SchoolCalendar> {
    const calendarType = input.type ?? CalendarType.MINISTERIAL;

    // Validate: SCHOOL calendars require schoolId
    if (calendarType === CalendarType.SCHOOL && !input.schoolId && !input.schoolName) {
      throw new ValidationError('Calendário escolar requer schoolId ou schoolName');
    }

    // Validate: only one active MINISTERIAL calendar per academic year (globally)
    if (calendarType === CalendarType.MINISTERIAL) {
      const existingMinisterial = await this.calendarRepository.findActiveMinisterial(input.academicYear);
      if (existingMinisterial) {
        throw new ValidationError(
          `Já existe um calendário ministerial activo para o ano ${input.academicYear}`,
        );
      }
    }

    // For SCHOOL calendars, check this school doesn't already have one for this year
    if (calendarType === CalendarType.SCHOOL && input.schoolId) {
      const existing = await this.calendarRepository.findBySchoolAndYear(input.schoolId, input.academicYear);
      if (existing) {
        throw new ValidationError(
          `Já existe um calendário para a escola "${input.schoolName || input.schoolId}" no ano ${input.academicYear}`,
        );
      }
    }

    // Generate template based on country
    const country = input.country || 'Angola';

    if (country === 'Angola') {
      const template = generateAngolaCalendar(input.academicYear, userId, input.schoolName);
      return this.calendarRepository.create({
        ...template,
        type: calendarType,
        schoolId: input.schoolId,
      });
    }

    // For other countries, create a basic structure
    throw new ValidationError(`Template de calendário para "${country}" ainda não disponível. Disponível: Angola.`);
  }
}
