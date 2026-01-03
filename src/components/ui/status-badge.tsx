import { cn } from '@/lib/utils';

type Status = 'approved' | 'pending' | 'rejected' | 'active' | 'inactive';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusStyles: Record<Status, string> = {
  approved: 'status-approved',
  pending: 'status-pending',
  rejected: 'status-rejected',
  active: 'status-approved',
  inactive: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<Status, string> = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
  active: 'Active',
  inactive: 'Inactive',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('status-badge', statusStyles[status], className)}>
      {statusLabels[status]}
    </span>
  );
}
