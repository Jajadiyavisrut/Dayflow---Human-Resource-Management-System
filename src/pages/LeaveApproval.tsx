import { useState } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, User, Filter } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLeaveRequests, useApproveLeave, useLeaveStatistics } from '@/hooks/useLeaveManagement';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export default function LeaveApproval() {
    const { user } = useAuth();
    const { data: leaveRequests, isLoading } = useLeaveRequests();
    const approveLeave = useApproveLeave();
    const { data: statistics } = useLeaveStatistics();

    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [rejectionDialog, setRejectionDialog] = useState<{ open: boolean; requestId: string }>({ open: false, requestId: '' });
    const [rejectionReason, setRejectionReason] = useState('');

    const filteredRequests = leaveRequests?.filter(request => {
        if (filterStatus === 'all') return true;
        return request.status === filterStatus;
    }) || [];

    const handleApprove = (requestId: string) => {
        approveLeave.mutate({ requestId, status: 'approved' });
    };

    const handleReject = () => {
        if (rejectionReason.trim()) {
            approveLeave.mutate({
                requestId: rejectionDialog.requestId,
                status: 'rejected',
                rejectionReason: rejectionReason.trim()
            });
            setRejectionDialog({ open: false, requestId: '' });
            setRejectionReason('');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getLeaveTypeColor = (type: string) => {
        switch (type) {
            case 'annual': return 'bg-blue-100 text-blue-800';
            case 'sick': return 'bg-orange-100 text-orange-800';
            case 'unpaid': return 'bg-gray-100 text-gray-800';
            case 'maternity': return 'bg-pink-100 text-pink-800';
            case 'paternity': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (!user || user.role !== 'hr') {
        return (
            <DashboardLayout title="Access Denied" subtitle="You don't have permission to access this page">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">This page is only accessible to HR users.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Leave Approval" subtitle="Review and manage leave requests">

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                                <p className="text-2xl font-bold">{statistics?.total || 0}</p>
                            </div>
                            <Calendar className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                                <p className="text-2xl font-bold text-yellow-600">{statistics?.pending || 0}</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                                <p className="text-2xl font-bold text-green-600">{statistics?.approved || 0}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                                <p className="text-2xl font-bold text-red-600">{statistics?.rejected || 0}</p>
                            </div>
                            <XCircle className="h-8 w-8 text-red-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <Label htmlFor="filter">Filter by status:</Label>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Requests</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Requests List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Loading leave requests...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No leave requests found.</p>
                    </div>
                ) : (
                    filteredRequests.map((request) => (
                        <Card key={request.id}>
                            <CardContent className="pt-6">
                                <div className="flex items-start justify-between">

                                    {/* Request Details */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span className="font-medium">{request.profile?.full_name}</span>
                                            </div>
                                            <Badge className={getStatusColor(request.status)}>
                                                {request.status}
                                            </Badge>
                                            <Badge className={getLeaveTypeColor(request.leave_type)}>
                                                {request.leave_type.replace('_', ' ')}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Department:</span>
                                                <span className="ml-2">{request.profile?.department || 'Not assigned'}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Duration:</span>
                                                <span className="ml-2">
                                                    {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Days:</span>
                                                <span className="ml-2 font-medium">{request.days} day(s)</span>
                                            </div>
                                        </div>

                                        {request.reason && (
                                            <div className="mt-3">
                                                <span className="text-sm text-muted-foreground">Reason: </span>
                                                <span className="text-sm">{request.reason}</span>
                                            </div>
                                        )}

                                        {request.rejection_reason && (
                                            <div className="mt-3 p-3 bg-red-50 rounded-lg">
                                                <span className="text-sm text-red-800">
                                                    <strong>Rejection Reason:</strong> {request.rejection_reason}
                                                </span>
                                            </div>
                                        )}

                                        <div className="mt-3 text-xs text-muted-foreground">
                                            Applied on {format(new Date(request.created_at), 'MMM d, yyyy at hh:mm a')}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {request.status === 'pending' && (
                                        <div className="flex gap-2 ml-4">
                                            <Button
                                                size="sm"
                                                onClick={() => handleApprove(request.id)}
                                                disabled={approveLeave.isPending}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Approve
                                            </Button>

                                            <Dialog
                                                open={rejectionDialog.open && rejectionDialog.requestId === request.id}
                                                onOpenChange={(open) => setRejectionDialog({ open, requestId: request.id })}
                                            >
                                                <DialogTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        disabled={approveLeave.isPending}
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1" />
                                                        Reject
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Reject Leave Request</DialogTitle>
                                                        <DialogDescription>
                                                            Please provide a reason for rejecting this leave request.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                                                            <Textarea
                                                                id="rejection-reason"
                                                                placeholder="Enter reason for rejection..."
                                                                value={rejectionReason}
                                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                                rows={3}
                                                            />
                                                        </div>
                                                        <div className="flex justify-end gap-3">
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setRejectionDialog({ open: false, requestId: '' });
                                                                    setRejectionReason('');
                                                                }}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                onClick={handleReject}
                                                                disabled={!rejectionReason.trim() || approveLeave.isPending}
                                                            >
                                                                Reject Request
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </DashboardLayout>
    );
}
