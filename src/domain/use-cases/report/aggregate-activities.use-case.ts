import { AggregatedActivity, TeachingActivity } from '@/src/domain/entities/teaching-activity.entity';
import { ITeachingActivityRepository } from '@/src/domain/interfaces/repositories/teaching-activity.repository';
import { ILessonRepository } from '@/src/domain/interfaces/repositories/lesson.repository';
import { LessonStatus } from '@/src/domain/entities/lesson.entity';

export interface AggregateActivitiesInput {
  userId: string;
  subject: string;
  grade: string;
  startDate: Date;
  endDate: Date;
}

export class AggregateActivitiesUseCase {
  constructor(
    private readonly activityRepository: ITeachingActivityRepository,
    private readonly lessonRepository: ILessonRepository,
  ) {}

  async execute(input: AggregateActivitiesInput): Promise<AggregatedActivity> {
    // Fetch explicit teaching activities for the period
    const activities = await this.activityRepository.findBySubjectAndPeriod(
      input.userId,
      input.subject,
      input.startDate,
      input.endDate,
    );

    // Also fetch delivered lessons to complement activity data
    const allLessons = await this.lessonRepository.findByUserId(input.userId);
    const deliveredLessons = allLessons.filter(
      (l) =>
        l.status === LessonStatus.DELIVERED &&
        l.date >= input.startDate &&
        l.date <= input.endDate,
    );

    // Merge and aggregate
    const topicSet = new Set<string>();
    const challengeMap = new Map<string, number>();
    const allOutcomes: string[] = [];
    let totalMinutes = 0;
    let totalStudents = 0;
    let studentEntries = 0;

    for (const activity of activities) {
      topicSet.add(activity.topic);
      totalMinutes += activity.duration;

      if (activity.studentCount) {
        totalStudents += activity.studentCount;
        studentEntries++;
      }

      for (const challenge of activity.challenges || []) {
        challengeMap.set(challenge, (challengeMap.get(challenge) || 0) + 1);
      }

      for (const outcome of activity.outcomes || []) {
        allOutcomes.push(outcome);
      }
    }

    // Add delivered lesson topics
    for (const lesson of deliveredLessons) {
      topicSet.add(lesson.topic);
      totalMinutes += lesson.duration;
    }

    const totalLessons = activities.length + deliveredLessons.length;

    // Sort challenges by frequency
    const sortedChallenges = [...challengeMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([challenge]) => challenge);

    return {
      subject: input.subject,
      grade: input.grade,
      totalLessons,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      topicsCovered: [...topicSet],
      averageStudentCount: studentEntries > 0 ? Math.round(totalStudents / studentEntries) : 0,
      commonChallenges: sortedChallenges.slice(0, 10),
      outcomes: allOutcomes,
      dateRange: { start: input.startDate, end: input.endDate },
    };
  }
}
