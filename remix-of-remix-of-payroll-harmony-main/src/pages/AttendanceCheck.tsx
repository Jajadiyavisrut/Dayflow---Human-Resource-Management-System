import { useState } from 'react';
import { Clock, LogIn, LogOut, Calendar, MapPin } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCheckIn, useCheckOut, useTodayAttendance, useAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';

export default function AttendanceCheck() {
    const { user, session } = useAuth();
    const { data: todayAttendance } = useTodayAttendance();
    const { data: weekAttendance } = useAttendance();
    const checkIn = useCheckIn();
    const checkOut = useCheckOut();

    const [location, setLocation] = useState('');

    // Get current week attendance
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const getAttendanceForDay = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return weekAttendance?.find(att => att.date === dateStr);
    };

    const getAttendanceStatus = (attendance: any) => {
        if (!attendance) return { status: 'Not recorded', color: 'bg-gray-100 text-gray-800' };

        switch (attendance.status) {
            case 'present': return { status: 'Present', color: 'bg-green-100 text-green-800' };
            case 'absent': return { status: 'Absent', color: 'bg-red-100 text-red-800' };
            case 'late': return { status: 'Late', color: 'bg-yellow-100 text-yellow-800' };
            case 'half-day': return { status: 'Half Day', color: 'bg-orange-100 text-orange-800' };
            default: return { status: 'Unknown', color: 'bg-gray-100 text-gray-800' };
        }
    };

    const handleCheckIn = () => {
        checkIn.mutate();
    };

    const handleCheckOut = () => {
        if (todayAttendance?.id) {
            checkOut.mutate(todayAttendance.id);
        }
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    setLocation('Location unavailable');
                }
            );
        } else {
            setLocation('Geolocation not supported');
        }
    };

    // Get location on component mount
    useState(() => {
        getCurrentLocation();
    });

    return (
        <DashboardLayout title="Attendance" subtitle="Check in and out of work">

            {/* Today's Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* Check In/Out Card */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Today's Attendance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8">
                            <div className="text-4xl font-bold mb-2">
                                {format(new Date(), 'hh:mm:ss a')}
                            </div>
                            <div className="text-muted-foreground mb-6">
                                {format(new Date(), 'EEEE, MMMM d, yyyy')}
                            </div>

                            {/* Current Status */}
                            <div className="mb-6">
                                {todayAttendance ? (
                                    <div className="space-y-2">
                                        <Badge className={getAttendanceStatus(todayAttendance).color}>
                                            {getAttendanceStatus(todayAttendance).status}
                                        </Badge>
                                        <div className="text-sm text-muted-foreground">
                                            {todayAttendance.check_in && (
                                                <div>Checked in: {format(new Date(todayAttendance.check_in), 'hh:mm a')}</div>
                                            )}
                                            {todayAttendance.check_out && (
                                                <div>Checked out: {format(new Date(todayAttendance.check_out), 'hh:mm a')}</div>
                                            )}
                                            {todayAttendance.work_hours && (
                                                <div>Work hours: {todayAttendance.work_hours}</div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <Badge className="bg-gray-100 text-gray-800">Not checked in</Badge>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-center gap-4">
                                {!todayAttendance?.check_in ? (
                                    <Button
                                        size="lg"
                                        onClick={handleCheckIn}
                                        disabled={checkIn.isPending}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <LogIn className="h-4 w-4 mr-2" />
                                        {checkIn.isPending ? 'Checking in...' : 'Check In'}
                                    </Button>
                                ) : (
                                    <Button
                                        size="lg"
                                        onClick={handleCheckOut}
                                        disabled={checkOut.isPending || !!todayAttendance?.check_out}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        <LogOut className="h-4 w-4 mr-2" />
                                        {checkOut.isPending ? 'Checking out...' : 'Check Out'}
                                    </Button>
                                )}
                            </div>

                            {/* Location */}
                            {location && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>{location}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Weekly Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            This Week
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {weekDays.map((day) => {
                                const attendance = getAttendanceForDay(day);
                                const status = getAttendanceStatus(attendance);
                                const isCurrentDay = isToday(day);

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={`flex items-center justify-between p-2 rounded-lg ${isCurrentDay ? 'bg-primary/10 border border-primary/20' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-medium ${isCurrentDay ? 'text-primary' : ''}`}>
                                                {format(day, 'EEE')}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {format(day, 'MMM d')}
                                            </span>
                                        </div>
                                        <Badge className={status.color} variant="secondary">
                                            {status.status}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Attendance History */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Attendance History</CardTitle>
                </CardHeader>
                <CardContent>
                    {weekAttendance && weekAttendance.length > 0 ? (
                        <div className="space-y-3">
                            {weekAttendance
                                .filter(att => att.date !== format(new Date(), 'yyyy-MM-dd'))
                                .slice(0, 10)
                                .map((record) => {
                                    const status = getAttendanceStatus(record);
                                    return (
                                        <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <div className="font-medium">
                                                        {format(new Date(record.date), 'EEEE, MMMM d, yyyy')}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {record.check_in && `Check-in: ${format(new Date(record.check_in), 'hh:mm a')}`}
                                                        {record.check_out && ` • Check-out: ${format(new Date(record.check_out), 'hh:mm a')}`}
                                                        {record.work_hours && ` • Hours: ${record.work_hours}`}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge className={status.color}>
                                                {status.status}
                                            </Badge>
                                        </div>
                                    );
                                })}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">No attendance records found</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
