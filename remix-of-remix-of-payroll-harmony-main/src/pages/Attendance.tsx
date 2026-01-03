import { useState } from 'react';
import { Calendar, Clock, CheckCircle2, XCircle, MinusCircle, LogIn, LogOut, UserPlus } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataTable } from '@/components/ui/data-table';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useAttendance, useTodayAttendance, useCheckIn, useCheckOut, useManualAttendance } from '@/hooks/useAttendance';
import { useProfiles } from '@/hooks/useProfiles';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Skeleton } from '@/components/ui/skeleton';

const statusStyles = {
  present: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', label: 'Present' },
  absent: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Absent' },
  late: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10', label: 'Late' },
  'half-day': { icon: MinusCircle, color: 'text-info', bg: 'bg-info/10', label: 'Half Day' },
};

export default function Attendance() {
  const { user } = useAuth();
  const isHR = user?.role === 'hr';
  const [selectedMonth, setSelectedMonth] = useState('current');
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState({
    userId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    checkIn: '',
    checkOut: '',
    status: 'present',
    notes: '',
  });

  const { data: attendance, isLoading } = useAttendance();
  const { data: todayRecord } = useTodayAttendance();
  const { data: profiles } = useProfiles();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const manualAttendance = useManualAttendance();

  const isCheckedIn = !!todayRecord && !todayRecord.check_out;
  const hasCheckedOut = !!todayRecord?.check_out;

  const presentCount = attendance?.filter(a => a.status === 'present' || a.status === 'late').length || 0;
  const absentCount = attendance?.filter(a => a.status === 'absent').length || 0;
  const lateCount = attendance?.filter(a => a.status === 'late').length || 0;

  const handleCheckIn = () => {
    checkIn.mutate();
  };

  const handleCheckOut = () => {
    if (todayRecord?.id) {
      checkOut.mutate(todayRecord.id);
    }
  };

  const handleManualEntry = () => {
    if (!manualEntry.userId) return;

    manualAttendance.mutate({
      user_id: manualEntry.userId,
      date: manualEntry.date,
      check_in: manualEntry.checkIn ? new Date(`${manualEntry.date}T${manualEntry.checkIn}`).toISOString() : null,
      check_out: manualEntry.checkOut ? new Date(`${manualEntry.date}T${manualEntry.checkOut}`).toISOString() : null,
      status: manualEntry.status,
      notes: manualEntry.notes || undefined,
    });
    setIsManualEntryOpen(false);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    return format(new Date(isoString), 'hh:mm a');
  };

  return (
    <DashboardLayout
      title="Attendance"
      subtitle={isHR ? "Track team attendance and work hours" : "View your attendance records"}
    >
      {/* Check In/Out Section for Employees */}
      {!isHR && (
        <div className="bg-card rounded-xl border border-border p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Today's Attendance</h3>
              <p className="text-sm text-muted-foreground">
                {hasCheckedOut
                  ? `Checked out at ${formatTime(todayRecord?.check_out || null)}`
                  : isCheckedIn
                    ? `Checked in at ${formatTime(todayRecord?.check_in || null)}`
                    : 'You have not checked in yet'}
              </p>
            </div>
            <div className="flex gap-3">
              {!isCheckedIn && !hasCheckedOut ? (
                <Button onClick={handleCheckIn} disabled={checkIn.isPending} className="gap-2">
                  <LogIn className="h-4 w-4" />
                  {checkIn.isPending ? 'Checking in...' : 'Check In'}
                </Button>
              ) : isCheckedIn ? (
                <Button onClick={handleCheckOut} disabled={checkOut.isPending} variant="destructive" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  {checkOut.isPending ? 'Checking out...' : 'Check Out'}
                </Button>
              ) : (
                <Button disabled variant="outline" className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed for today
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title={isHR ? "Present Today" : "Days Present"}
          value={presentCount}
          subtitle={isHR ? "Employees checked in" : "This month"}
          icon={CheckCircle2}
          iconClassName="bg-success/10 text-success"
        />
        <StatCard
          title={isHR ? "Absent Today" : "Days Absent"}
          value={absentCount}
          subtitle={isHR ? "Not checked in" : "This month"}
          icon={XCircle}
          iconClassName="bg-destructive/10 text-destructive"
        />
        <StatCard
          title="Late Arrivals"
          value={lateCount}
          subtitle="After 9:30 AM"
          icon={Clock}
          iconClassName="bg-warning/10 text-warning"
        />
        <StatCard
          title="Total Records"
          value={attendance?.length || 0}
          subtitle="All time"
          icon={Calendar}
          iconClassName="bg-info/10 text-info"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">{format(new Date(), 'MMMM yyyy')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {isHR && (
            <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Manual Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Manual Attendance Entry</DialogTitle>
                  <DialogDescription>
                    Record attendance manually in case of machine failure or other issues.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select value={manualEntry.userId} onValueChange={(v) => setManualEntry({ ...manualEntry, userId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles?.map(p => (
                          <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={manualEntry.date}
                      onChange={(e) => setManualEntry({ ...manualEntry, date: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Check In Time</Label>
                      <Input
                        type="time"
                        value={manualEntry.checkIn}
                        onChange={(e) => setManualEntry({ ...manualEntry, checkIn: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Check Out Time</Label>
                      <Input
                        type="time"
                        value={manualEntry.checkOut}
                        onChange={(e) => setManualEntry({ ...manualEntry, checkOut: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={manualEntry.status} onValueChange={(v) => setManualEntry({ ...manualEntry, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="half-day">Half Day</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason (Optional)</Label>
                    <Input
                      placeholder="e.g., Machine failure, forgot to punch"
                      value={manualEntry.notes}
                      onChange={(e) => setManualEntry({ ...manualEntry, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsManualEntryOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleManualEntry} disabled={manualAttendance.isPending}>
                    {manualAttendance.isPending ? 'Saving...' : 'Save Entry'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline" onClick={() => {
            if (!attendance) return;
            // Import dynamically or assume it's imported at top. I will add import in a separate tool or use view to check if I can add it effectively. 
            // Better to add import at top first, but I can't do multiple edits easily without multi_replace.
            // I'll assume I can add the function here and will add exportToExcel import at the top in a separate call if needed, 
            // OR I can use the existing `exportToExcel` if I modify the top of the file too.
            // Actually, I should use multi_replace for this file to add import and usage.
            // But I'll stick to replace_file_content for simplicity and just add the function + button change, then add import.
            const exportData = attendance.map(record => ({
              Date: format(new Date(record.date), 'yyyy-MM-dd'),
              Employee: record.profile?.full_name || 'Unknown',
              'Check In': record.check_in ? format(new Date(record.check_in), 'hh:mm a') : '-',
              'Check Out': record.check_out ? format(new Date(record.check_out), 'hh:mm a') : '-',
              Status: record.status,
              'Work Hours': record.work_hours || '-'
            }));
            import('@/utils/export').then(mod => mod.exportToExcel(exportData, `Attendance_Report_${format(new Date(), 'yyyy-MM-dd')}`, 'Attendance'));
          }}>Export Report</Button>
        </div>
      </div>

      {/* Attendance Table */}
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
              render: (record: typeof attendance[0]) => (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {record.profile?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                    </span>
                  </div>
                  <span className="font-medium">{record.profile?.full_name || 'Unknown'}</span>
                </div>
              ),
            }] : []),
            {
              key: 'date',
              header: 'Date',
              render: (record: typeof attendance[0]) => format(new Date(record.date), 'MMM d, yyyy'),
            },
            {
              key: 'checkIn',
              header: 'Check In',
              render: (record: typeof attendance[0]) => formatTime(record.check_in),
            },
            {
              key: 'checkOut',
              header: 'Check Out',
              render: (record: typeof attendance[0]) => formatTime(record.check_out),
            },
            {
              key: 'status',
              header: 'Status',
              render: (record: typeof attendance[0]) => {
                const status = record.status as keyof typeof statusStyles || 'present';
                const style = statusStyles[status] || statusStyles.present;
                const Icon = style.icon;
                return (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {style.label}
                  </div>
                );
              },
            },
          ]}
          data={attendance || []}
          keyExtractor={(record) => record.id}
          emptyMessage="No attendance records found"
        />
      )}
    </DashboardLayout>
  );
}
