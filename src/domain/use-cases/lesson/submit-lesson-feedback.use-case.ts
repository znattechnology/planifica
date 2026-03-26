import { Lesson, LessonStatus } from '@/src/domain/entities/lesson.entity';
import { ILessonRepository, LessonFeedbackData } from '@/src/domain/interfaces/repositories/lesson.repository';
import { EntityNotFoundError } from '@/src/domain/errors/domain.error';

export interface SubmitFeedbackInput {
  lessonId: string;
  userId: string;
  status: LessonStatus;
  teacherNotes?: string;
  actualDuration?: number;
}

export class SubmitLessonFeedbackUseCase {
  constructor(
    private readonly lessonRepository: ILessonRepository,
  ) {}

  async execute(input: SubmitFeedbackInput): Promise<Lesson> {
    const lesson = await this.lessonRepository.findById(input.lessonId);
    if (!lesson) {
      throw new EntityNotFoundError('Lesson', input.lessonId);
    }

    if (lesson.userId !== input.userId) {
      throw new EntityNotFoundError('Lesson', input.lessonId);
    }

    const validStatuses = [
      LessonStatus.DELIVERED,
      LessonStatus.PARTIALLY_COMPLETED,
      LessonStatus.NOT_COMPLETED,
    ];
    if (!validStatuses.includes(input.status)) {
      throw new Error(
        `Status inválido para feedback: ${input.status}. Use: ${validStatuses.join(', ')}`,
      );
    }

    const updateData: Partial<Lesson> = {
      status: input.status,
      completedAt: new Date(),
    };

    if (input.teacherNotes !== undefined) {
      updateData.teacherNotes = input.teacherNotes;
    }

    if (input.actualDuration !== undefined) {
      updateData.actualDuration = input.actualDuration;
    }

    return this.lessonRepository.update(input.lessonId, updateData);
  }
}
