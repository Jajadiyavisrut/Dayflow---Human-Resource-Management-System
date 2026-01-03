import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Clock, Calendar, LogOut, FileText, DollarSign, Bell, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useProfiles } from '@/hooks/useProfiles';
import { useTodayAttendance } from '@/hooks/useAttendance';
import { format } from 'date-fns';

export default function EmployeeDashboard() {
    const navigate = useNavigate();
    const { user, session, logout } = useAuth();
    const { toast } = useToast();
    const { data: profile } = useProfiles();
    const { data: todayAttendance } = useTodayAttendance();

    const myProfile = profile?.find(p => p.user_id === session?.user?.id);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            toast({
                title: 'Logout failed',
                description: 'Please try again.',
                variant: 'destructive',
            });
        }
    };

    const getAttendanceStatus = () => {
        if (!todayAttendance) return { status: 'Not checked in', color: 'text-gray-500' };

        switch (todayAttendance.status) {
            case 'present':
                return { status: 'Present', color: 'text-green-500' };
            case 'absent':
                return { status: 'Absent', color: 'text-red-500' };
            case 'late':
                return { status: 'Late', color: 'text-yellow-500' };
            case 'half-day':
                return { status: 'Half Day', color: 'text-orange-500' };
            default:
                return { status: 'Unknown', color: 'text-gray-500' };
        }
    };

    const attendanceStatus = getAttendanceStatus();

    return (
        <DashboardLayout title="Employee Dashboard" subtitle="Welcome back! Here's your overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Profile Card */}
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/profile')}>
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Profile</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{myProfile?.full_name || 'Loading...'}</div>
                        <p className="text-xs text-muted-foreground">
                            {myProfile?.position || 'Position not set'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {myProfile?.department || 'Department not set'}
                        </p>
                    </CardContent>
                </Card>

                {/* Attendance Card */}
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/attendance')}>
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${attendanceStatus.color}`}>
                            {attendanceStatus.status}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {todayAttendance?.check_in ? `Checked in at ${format(new Date(todayAttendance.check_in), 'hh:mm a')}` : 'Not checked in'}
                        </p>
                    </CardContent>
                </Card>

                {/* Leave Requests Card */}
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/leave')}>
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Leave Balance</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {myProfile?.remaining_annual_leave || 0} days
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Annual leave remaining
                        </p>
                        <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">Sick: </span>
                            <span className="font-medium">{myProfile?.remaining_sick_leave || 0} days</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Salary Card */}
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/payroll')}>
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Salary</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {myProfile?.salary ? new Intl.NumberFormat('en-IN', {
                                style: 'currency',
                                currency: 'INR',
                                maximumFractionDigits: 0,
                            }).format(myProfile.salary) : 'Not set'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Monthly salary
                        </p>
                    </CardContent>
                </Card>

                {/* Documents Card */}
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/documents')}>
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Documents</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">
                            Uploaded documents
                        </p>
                    </CardContent>
                </Card>

                {/* Quick Actions Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => navigate('/leave-request')}
                        >
                            <Calendar className="h-4 w-4 mr-2" />
                            Apply for Leave
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => navigate('/attendance-check')}
                        >
                            <Clock className="h-4 w-4 mr-2" />
                            Check In/Out
                        </Button>
                    </CardContent>
                </Card>

                {/* Notifications Card */}
                <Card className="md:col-span-2 lg:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span>Welcome to the HRMS system! Complete your profile to get started.</span>
                            </div>
                            {todayAttendance?.check_in && (
                                <div className="flex items-center space-x-2 text-sm">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>You checked in today at {format(new Date(todayAttendance.check_in), 'hh:mm a')}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Logout Card */}
                <Card className="md:col-span-2 lg:col-span-3">
                    <CardContent className="pt-6">
                        <Button
                            variant="outline"
                            onClick={handleLogout}
                            className="w-full"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
