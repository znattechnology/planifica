export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  role: UserRole;
  school?: string;
  subject?: string;
  selectedCalendarId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  TEACHER = 'TEACHER',
  COORDINATOR = 'COORDINATOR',
  ADMIN = 'ADMIN',
}
