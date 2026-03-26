export interface Report {
  id: string;
  userId: string;
  type: ReportType;
  title: string;
  subject: string;
  grade: string;
  academicYear: string;
  period: ReportPeriod;
  content: ReportContent;
  status: ReportStatus;
  generatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum ReportType {
  TRIMESTER = 'TRIMESTER',
  ANNUAL = 'ANNUAL',
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  REVIEWED = 'REVIEWED',
  FINALIZED = 'FINALIZED',
}

export interface ReportPeriod {
  trimester?: number; // 1, 2, or 3
  year: number;
  startDate: Date;
  endDate: Date;
}

export interface ReportContent {
  summary: string;
  objectivesAchieved: ReportObjective[];
  topicsCovered: ReportTopic[];
  studentPerformance: string;
  methodology: string;
  challenges: string[];
  recommendations: string[];
  statistics: ReportStatistics;
  rawAIOutput?: string;
}

export interface ReportObjective {
  description: string;
  status: 'achieved' | 'partial' | 'not_achieved';
  evidence?: string;
}

export interface ReportTopic {
  title: string;
  hoursSpent: number;
  completionPercentage: number;
  observations?: string;
}

export interface ReportStatistics {
  totalLessonsDelivered: number;
  totalHoursWorked: number;
  totalTopicsCovered: number;
  plannedVsDelivered: number; // percentage
  averageStudentCount?: number;
}
