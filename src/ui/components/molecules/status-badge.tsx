'use client';

import { cn } from '@/src/shared/utils/cn';
import { PlanStatus } from '@/src/domain/entities/plan.entity';
import { PLAN_STATUS_LABELS } from '@/src/shared/constants/app.constants';

interface StatusBadgeProps {
  status: PlanStatus;
  className?: string;
}

const statusStyles: Record<PlanStatus, string> = {
  [PlanStatus.DRAFT]: 'bg-gray-100 text-gray-700',
  [PlanStatus.GENERATING]: 'bg-yellow-100 text-yellow-700 animate-pulse',
  [PlanStatus.GENERATED]: 'bg-blue-100 text-blue-700',
  [PlanStatus.REVIEWED]: 'bg-purple-100 text-purple-700',
  [PlanStatus.APPROVED]: 'bg-green-100 text-green-700',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', statusStyles[status], className)}>
      {PLAN_STATUS_LABELS[status]}
    </span>
  );
}
