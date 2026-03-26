import { Lesson, LessonStatus } from '@/src/domain/entities/lesson.entity';
import { ILessonRepository } from '@/src/domain/interfaces/repositories/lesson.repository';
import { IPlanRepository } from '@/src/domain/interfaces/repositories/plan.repository';
import { EntityNotFoundError } from '@/src/domain/errors/domain.error';

export interface GenerateLessonInput {
  userId: string;
  planId: string;
  title: string;
  date: Date;
  duration: number;
  topic: string;
}

export class GenerateLessonUseCase {
  constructor(
    private readonly lessonRepository: ILessonRepository,
    private readonly planRepository: IPlanRepository,
  ) {}

  async execute(input: GenerateLessonInput): Promise<Lesson> {
    const plan = await this.planRepository.findById(input.planId);
    if (!plan) {
      throw new EntityNotFoundError('Plan', input.planId);
    }

    return this.lessonRepository.create({
      planId: input.planId,
      userId: input.userId,
      title: input.title,
      date: input.date,
      duration: input.duration,
      topic: input.topic,
      content: {
        objective: '',
        competencies: [],
        introduction: { description: '', duration: 0, activities: [], teacherActions: [], studentActions: [] },
        development: { description: '', duration: 0, activities: [], teacherActions: [], studentActions: [] },
        conclusion: { description: '', duration: 0, activities: [], teacherActions: [], studentActions: [] },
        resources: [],
        assessment: '',
      },
      status: LessonStatus.DRAFT,
    });
  }
}
