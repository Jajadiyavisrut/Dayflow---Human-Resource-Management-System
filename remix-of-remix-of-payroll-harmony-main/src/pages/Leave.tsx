import { useState } from 'react';
import { Plus, Calendar, FileText, Clock, CheckCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaveRequests, useCreateLeaveRequest, useUpdateLeaveStatus, LeaveRequest } from '@/hooks/useLeaveRequests';
import { useMyProfile } from '@/hooks/useProfiles';
import { format, differenceInDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function Leave() {
  const { user } = useAuth();
  const isHR = user?.role === 'hr';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newRequest, setNewRequest] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const { data: leaveRequests, isLoading } = useLeaveRequests(statusFilter);
  const { data: myProfile } = useMyProfile();
  const createLeave = useCreateLeaveRequest();
  const updateStatus = useUpdateLeaveStatus();

  const pendingCount = leaveRequests?.filter(r => r.status === 'pending').length || 0;
  const approvedCount = leaveRequests?.filter(r => r.status === 'approved').length || 0;
  const rejectedCount = leaveRequests?.filter(r => r.status === 'rejected').length || 0;

  const handleSubmitRequest = () => {
    if (!newRequest.leave_type || !newRequest.start_date || !newRequest.end_date) return;

    const days = differenceInDays(new Date(newRequest.end_date), new Date(newRequest.start_date)) + 1;

    createLeave.mutate({
      leave_type: newRequest.leave_type,
      start_date: newRequest.start_date,
      end_date: newRequest.end_date,
      days,
      reason: newRequest.reason,
    });
    setIsDialogOpen(false);
    setNewRequest({ leave_type: '', start_date: '', end_date: '', reason: '' });
  };

  const handleApprove = (id: string) => {
    updateStatus.mutate({ id, status: 'approved' });
  };

  const handleReject = (id: string) => {
    updateStatus.mutate({ id, status: 'rejected' });
  };

  return (
    <DashboardLayout
      title="Leave Management"
      subtitle={isHR ? "Review and manage leave requests" : "Request and track your leaves"}
    >
      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {isHR ? (
          <>
            <StatCard
              title="Pending Requests"
              value={pendingCount}
              subtitle="Awaiting approval"
              icon={Clock}
              iconClassName="bg-warning/10 text-warning"
            />
            <StatCard
              title="Approved This Month"
              value={approvedCount}
              subtitle="Leave requests"
              icon={CheckCircle}
              iconClassName="bg-success/10 text-success"
            />
            <StatCard
              title="Rejected"
              value={rejectedCount}
              subtitle="This period"
              icon={Calendar}
              iconClassName="bg-destructive/10 text-destructive"
            />
            <StatCard
              title="Total Requests"
              value={leaveRequests?.length || 0}
              subtitle="All time"
              icon={FileText}
            />
          </>
        ) : (
          <>
            <StatCard
              title="Annual Leave Balance"
              value={`${myProfile?.remaining_annual_leave || 0} days`}
              subtitle="Available"
              icon={Calendar}
            />
            <StatCard
              title="Sick Leave Balance"
              value={`${myProfile?.remaining_sick_leave || 0} days`}
              subtitle="Available"
              icon={FileText}
              iconClassName="bg-info/10 text-info"
            />
            <StatCard
              title="Pending Requests"
              value={pendingCount}
              subtitle="Awaiting approval"
              icon={Clock}
              iconClassName="bg-warning/10 text-warning"
            />
            <StatCard
              title="Total Requests"
              value={leaveRequests?.length || 0}
              subtitle="All time"
              icon={CheckCircle}
              iconClassName="bg-success/10 text-success"
            />
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
              <SelectItem value="approved">Approved ({approvedCount})</SelectItem>
              <SelectItem value="rejected">Rejected ({rejectedCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave request for approval.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select value={newRequest.leave_type} onValueChange={(v) => setNewRequest({ ...newRequest, leave_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacation">Annual Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={newRequest.start_date}
                    onChange={(e) => setNewRequest({ ...newRequest, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={newRequest.end_date}
                    onChange={(e) => setNewRequest({ ...newRequest, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Briefly describe the reason for your leave..."
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitRequest} disabled={createLeave.isPending}>
                {createLeave.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Requests Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={[
            ...(isHR ? [{
              key: 'employee',
              header: 'Employee',
              render: (request: LeaveRequest) => (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {request.profile?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium block">{request.profile?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">
                      Annual: {request.profile?.remaining_annual_leave || 0}d | Sick: {request.profile?.remaining_sick_leave || 0}d
                    </span>
                  </div>
                </div>
              ),
            }] : []),
            {
              key: 'leave_type',
              header: 'Type',
              render: (request: LeaveRequest) => (
                <span className="capitalize">
                  {request.leave_type === 'vacation' ? 'Annual Leave' :
                    request.leave_type === 'sick' ? 'Sick Leave' :
                      request.leave_type}
                </span>
              ),
            },
            {
              key: 'dates',
              header: 'Dates',
              render: (request: LeaveRequest) => (
                <span>{format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d')}</span>
              ),
            },
            {
              key: 'days',
              header: 'Days',
              render: (request: LeaveRequest) => (
                <span className="font-medium">{request.days} day{request.days > 1 ? 's' : ''}</span>
              ),
            },
            { key: 'reason', header: 'Reason' },
            {
              key: 'appliedOn',
              header: 'Applied On',
              render: (request: LeaveRequest) => format(new Date(request.created_at), 'MMM d'),
            },
            {
              key: 'status',
              header: 'Status',
              render: (request: LeaveRequest) => (
                <StatusBadge status={request.status as 'pending' | 'approved' | 'rejected'} />
              ),
            },
            ...(isHR ? [{
              key: 'actions',
              header: 'Actions',
              render: (request: LeaveRequest) => {
                if (request.status !== 'pending') return null;
                if (request.user_id === user?.id) {
                  return <span className="text-xs text-muted-foreground italic">Self Request</span>;
                }
                return (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-success hover:text-success hover:bg-success/10"
                      onClick={() => handleApprove(request.id)}
                      disabled={updateStatus.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleReject(request.id)}
                      disabled={updateStatus.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                );
              },
            }] : []),
          ]}
          data={leaveRequests || []}
          keyExtractor={(request) => request.id}
          emptyMessage="No leave requests found"
        />
      )}
    </DashboardLayout>
  );
}
