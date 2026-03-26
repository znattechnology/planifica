import { ISchoolCalendarRepository } from '@/src/domain/interfaces/repositories/school-calendar.repository';
import { SchoolCalendar } from '@/src/domain/entities/school-calendar.entity';

export class GetSchoolCalendarUseCase {
  constructor(
    private readonly calendarRepository: ISchoolCalendarRepository,
  ) {}

  async getByYear(userId: string, academicYear: string): Promise<SchoolCalendar | null> {
    return this.calendarRepository.findByUserAndYear(userId, academicYear);
  }

  async getAll(userId: string): Promise<SchoolCalendar[]> {
    return this.calendarRepository.findAllByUser(userId);
  }
}
