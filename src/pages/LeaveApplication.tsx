import { useState } from 'react';
import { Calendar, Clock, FileText, Send } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApplyLeave, useMyLeaveBalance, useLeaveRequests } from '@/hooks/useLeaveManagement';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';

export default function LeaveApplication() {
    const { user } = useAuth();
    const applyLeave = useApplyLeave();
    const { data: leaveBalance } = useMyLeaveBalance();
    const { data: myRequests } = useLeaveRequests();

    const [formData, setFormData] = useState({
        start_date: '',
        end_date: '',
        leave_type: '' as 'annual' | 'sick' | 'unpaid' | 'maternity' | 'paternity',
        reason: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.start_date) {
            newErrors.start_date = 'Start date is required';
        }

        if (!formData.end_date) {
            newErrors.end_date = 'End date is required';
        }

        if (!formData.leave_type) {
            newErrors.leave_type = 'Leave type is required';
        }

        if (!formData.reason.trim()) {
            newErrors.reason = 'Reason is required';
        }

        if (formData.start_date && formData.end_date) {
            const startDate = new Date(formData.start_date);
            const endDate = new Date(formData.end_date);
            const today = startOfDay(new Date());

            if (isBefore(startDate, today)) {
                newErrors.start_date = 'Start date cannot be in the past';
            }

            if (isBefore(endDate, startDate)) {
                newErrors.end_date = 'End date must be after start date';
            }

            // Calculate days
            const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            // Check leave balance
            if (formData.leave_type === 'annual' && leaveBalance) {
                if (days > leaveBalance.remaining_annual_leave) {
                    newErrors.start_date = `Insufficient annual leave balance. You have ${leaveBalance.remaining_annual_leave} days remaining.`;
                }
            }

            if (formData.leave_type === 'sick' && leaveBalance) {
                if (days > leaveBalance.remaining_sick_leave) {
                    newErrors.start_date = `Insufficient sick leave balance. You have ${leaveBalance.remaining_sick_leave} days remaining.`;
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            applyLeave.mutate(formData);
        }
    };

    const calculateDays = () => {
        if (formData.start_date && formData.end_date) {
            const startDate = new Date(formData.start_date);
            const endDate = new Date(formData.end_date);
            return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }
        return 0;
    };

    return (
        <DashboardLayout title="Leave Application" subtitle="Apply for time off">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Application Form */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Leave Application Form
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">

                                {/* Leave Type */}
                                <div className="space-y-2">
                                    <Label htmlFor="leave_type">Leave Type *</Label>
                                    <Select
                                        value={formData.leave_type}
                                        onValueChange={(value: any) => setFormData(prev => ({ ...prev, leave_type: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select leave type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="annual">Annual Leave</SelectItem>
                                            <SelectItem value="sick">Sick Leave</SelectItem>
                                            <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                                            <SelectItem value="maternity">Maternity Leave</SelectItem>
                                            <SelectItem value="paternity">Paternity Leave</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.leave_type && (
                                        <p className="text-sm text-destructive">{errors.leave_type}</p>
                                    )}
                                </div>

                                {/* Date Range */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="start_date">Start Date *</Label>
                                        <Input
                                            id="start_date"
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                                            min={format(new Date(), 'yyyy-MM-dd')}
                                        />
                                        {errors.start_date && (
                                            <p className="text-sm text-destructive">{errors.start_date}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="end_date">End Date *</Label>
                                        <Input
                                            id="end_date"
                                            type="date"
                                            value={formData.end_date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                                            min={formData.start_date || format(new Date(), 'yyyy-MM-dd')}
                                        />
                                        {errors.end_date && (
                                            <p className="text-sm text-destructive">{errors.end_date}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Duration Display */}
                                {formData.start_date && formData.end_date && (
                                    <div className="bg-muted/50 rounded-lg p-4">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                                Duration: {calculateDays()} day(s)
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Reason */}
                                <div className="space-y-2">
                                    <Label htmlFor="reason">Reason *</Label>
                                    <Textarea
                                        id="reason"
                                        placeholder="Please provide a reason for your leave request..."
                                        value={formData.reason}
                                        onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                        rows={4}
                                    />
                                    {errors.reason && (
                                        <p className="text-sm text-destructive">{errors.reason}</p>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={applyLeave.isPending}
                                >
                                    {applyLeave.isPending ? (
                                        <>Submitting...</>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4 mr-2" />
                                            Submit Leave Application
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">

                    {/* Leave Balance */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Leave Balance
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Annual Leave</span>
                                <span className="text-lg font-bold text-green-600">
                                    {leaveBalance?.remaining_annual_leave || 0} days
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Sick Leave</span>
                                <span className="text-lg font-bold text-blue-600">
                                    {leaveBalance?.remaining_sick_leave || 0} days
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Requests */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {myRequests && myRequests.length > 0 ? (
                                <div className="space-y-3">
                                    {myRequests.slice(0, 3).map((request) => (
                                        <div key={request.id} className="border rounded-lg p-3">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-sm font-medium capitalize">
                                                    {request.leave_type.replace('_', ' ')}
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded-full ${request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                        request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {request.status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {request.days} day(s)
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No previous requests</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
