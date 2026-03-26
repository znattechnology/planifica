export interface TeacherProfile {
  id: string;
  userId: string;
  schoolName: string;
  country: string;
  academicYear: string;
  subjects: string[];
  classes: string[];
  numberOfClasses: number;
  teachingStyle?: string;
  createdAt: Date;
  updatedAt: Date;
}
