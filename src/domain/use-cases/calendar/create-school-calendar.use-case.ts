import { ISchoolCalendarRepository } from '@/src/domain/interfaces/repositories/school-calendar.repository';
import { SchoolCalendar } from '@/src/domain/entities/school-calendar.entity';
import { generateAngolaCalendar } from '@/src/domain/services/angola-calendar.template';
import { ValidationError } from '@/src/domain/errors/domain.error';

export interface CreateCalendarInput {
  academicYear: string;
  country?: string;
  schoolName?: string;
}

export class CreateSchoolCalendarUseCase {
  constructor(
    private readonly calendarRepository: ISchoolCalendarRepository,
  ) {}

  async execute(userId: string, input: CreateCalendarInput): Promise<SchoolCalendar> {
    // Check if calendar already exists for this year
    const existing = await this.calendarRepository.findByUserAndYear(userId, input.academicYear);
    if (existing) {
      throw new ValidationError(`Já existe um calendário para o ano ${input.academicYear}`);
    }

    // Generate template based on country
    const country = input.country || 'Angola';

    if (country === 'Angola') {
      const template = generateAngolaCalendar(input.academicYear, userId, input.schoolName);
      return this.calendarRepository.create(template);
    }

    // For other countries, create a basic structure
    // (can be extended later with country-specific templates)
    throw new ValidationError(`Template de calendário para "${country}" ainda não disponível. Disponível: Angola.`);
  }
}
