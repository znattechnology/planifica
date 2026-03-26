import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { ITeacherProfileRepository } from '@/src/domain/interfaces/repositories/teacher-profile.repository';
import { TeacherProfile } from '@/src/domain/entities/teacher-profile.entity';
import { UnauthorizedError } from '@/src/domain/errors/domain.error';

export interface OnboardingInput {
  schoolName: string;
  country: string;
  academicYear: string;
  subjects: string[];
  classes: string[];
  numberOfClasses: number;
  teachingStyle?: string;
}

export class CompleteOnboardingUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly teacherProfileRepository: ITeacherProfileRepository,
  ) {}

  async execute(userId: string, input: OnboardingInput): Promise<TeacherProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Utilizador não encontrado');
    }

    const profile = await this.teacherProfileRepository.upsert(userId, {
      schoolName: input.schoolName,
      country: input.country,
      academicYear: input.academicYear,
      subjects: input.subjects,
      classes: input.classes,
      numberOfClasses: input.numberOfClasses,
      teachingStyle: input.teachingStyle,
    });

    // Update user with school and subject info + mark onboarding as completed
    await this.userRepository.update(userId, {
      school: input.schoolName,
      subject: input.subjects[0],
      onboardingCompleted: true,
    });

    return profile;
  }
}
