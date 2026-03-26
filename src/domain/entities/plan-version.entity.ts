import { PlanContent } from './plan.entity';

export interface PlanVersion {
  id: string;
  planId: string;
  version: number;
  content: PlanContent;
  changeDescription: string;
  createdBy: string;
  createdAt: Date;
}

export interface PlanWithVersions {
  planId: string;
  currentVersion: number;
  versions: PlanVersion[];
}
