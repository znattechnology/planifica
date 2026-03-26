import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageCalendarEventsUseCase } from '@/src/domain/use-cases/calendar/manage-calendar-events.use-case';
import { CalendarEventType } from '@/src/domain/entities/school-calendar.entity';
import { ValidationError, UnauthorizedError } from '@/src/domain/errors/domain.error';
import type { ISchoolCalendarRepository } from '@/src/domain/interfaces/repositories/school-calendar.repository';

const mockCalendar = {
  id: 'cal-1',
  userId: 'user-1',
  academicYear: '2025/2026',
  country: 'Angola',
  startDate: new Date('2025-09-01'),
  endDate: new Date('2026-06-30'),
  terms: [],
  events: [
    {
      id: 'evt-1',
      calendarId: 'cal-1',
      title: 'Feriado Nacional',
      startDate: new Date('2025-11-11'),
      endDate: new Date('2025-11-11'),
      type: CalendarEventType.NATIONAL_HOLIDAY,
      allDay: true,
      createdAt: new Date(),
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockNewEvent = {
  id: 'evt-2',
  calendarId: 'cal-1',
  title: 'Reunião pedagógica',
  startDate: new Date('2025-10-15'),
  endDate: new Date('2025-10-15'),
  type: CalendarEventType.PEDAGOGICAL_ACTIVITY,
  allDay: true,
  createdAt: new Date(),
};

describe('ManageCalendarEventsUseCase', () => {
  let useCase: ManageCalendarEventsUseCase;
  let calendarRepository: ISchoolCalendarRepository;

  beforeEach(() => {
    calendarRepository = {
      findByUserAndYear: vi.fn().mockResolvedValue(mockCalendar),
      findAllByUser: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      addEvent: vi.fn().mockResolvedValue(mockNewEvent),
      removeEvent: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new ManageCalendarEventsUseCase(calendarRepository);
  });

  describe('addEvent', () => {
    it('should add event to calendar', async () => {
      const result = await useCase.addEvent('user-1', '2025/2026', {
        title: 'Reunião pedagógica',
        startDate: new Date('2025-10-15'),
        endDate: new Date('2025-10-15'),
        type: CalendarEventType.PEDAGOGICAL_ACTIVITY,
      });

      expect(result.id).toBe('evt-2');
      expect(calendarRepository.addEvent).toHaveBeenCalledWith(
        'cal-1',
        expect.objectContaining({ title: 'Reunião pedagógica', allDay: true }),
      );
    });

    it('should throw ValidationError if calendar not found', async () => {
      vi.mocked(calendarRepository.findByUserAndYear).mockResolvedValue(null);

      await expect(
        useCase.addEvent('user-1', '2025/2026', {
          title: 'Test',
          startDate: new Date(),
          endDate: new Date(),
          type: CalendarEventType.CUSTOM,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw UnauthorizedError if user does not own calendar', async () => {
      vi.mocked(calendarRepository.findByUserAndYear).mockResolvedValue({
        ...mockCalendar,
        userId: 'other-user',
      });

      await expect(
        useCase.addEvent('user-1', '2025/2026', {
          title: 'Test',
          startDate: new Date(),
          endDate: new Date(),
          type: CalendarEventType.CUSTOM,
        }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should default allDay to true when not specified', async () => {
      await useCase.addEvent('user-1', '2025/2026', {
        title: 'Test',
        startDate: new Date(),
        endDate: new Date(),
        type: CalendarEventType.CUSTOM,
      });

      expect(calendarRepository.addEvent).toHaveBeenCalledWith(
        'cal-1',
        expect.objectContaining({ allDay: true }),
      );
    });
  });

  describe('removeEvent', () => {
    it('should remove event from calendar', async () => {
      await useCase.removeEvent('user-1', '2025/2026', 'evt-1');

      expect(calendarRepository.removeEvent).toHaveBeenCalledWith('evt-1');
    });

    it('should throw ValidationError if calendar not found', async () => {
      vi.mocked(calendarRepository.findByUserAndYear).mockResolvedValue(null);

      await expect(
        useCase.removeEvent('user-1', '2025/2026', 'evt-1'),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw UnauthorizedError if user does not own calendar', async () => {
      vi.mocked(calendarRepository.findByUserAndYear).mockResolvedValue({
        ...mockCalendar,
        userId: 'other-user',
      });

      await expect(
        useCase.removeEvent('user-1', '2025/2026', 'evt-1'),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw ValidationError if event not found in calendar', async () => {
      await expect(
        useCase.removeEvent('user-1', '2025/2026', 'nonexistent'),
      ).rejects.toThrow(ValidationError);
    });
  });
});
