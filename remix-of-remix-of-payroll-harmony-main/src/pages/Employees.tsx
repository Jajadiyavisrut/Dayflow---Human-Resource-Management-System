import { useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Mail, Phone, Clock, Trash2, Plane } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox as CheckboxUI } from '@/components/ui/checkbox';
import { useProfiles } from '@/hooks/useProfiles';
import { useDeleteEmployee } from '@/hooks/useDeleteEmployee';
import { useTodayAttendanceForAll, useTodayLeaveStatus } from '@/hooks/useAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@supabase/supabase-js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfilePictureUpload } from '@/components/ProfilePictureUpload';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const getStatusIndicatorColor = (status?: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-500';
    case 'inactive':
      return 'bg-red-500';
    default:
      return 'bg-muted';
  }
};

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'leave'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [newEmployee, setNewEmployee] = useState({ full_name: '', email: '', password: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: string; name: string } | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const isHR = user?.role === 'hr';

  const { data: employees, isLoading } = useProfiles();
  const { data: todayAttendance } = useTodayAttendanceForAll();
  const { data: todayLeaveStatus } = useTodayLeaveStatus();
  const deleteEmployee = useDeleteEmployee();

  // Helper to determine status type safely
  const getEmployeeDailyStatus = (userId: string) => {
    if (todayLeaveStatus?.[userId]) return 'leave';
    const record = todayAttendance?.[userId];
    if (record === 'present' || record === 'late' || record === 'half-day') return 'present';
    return 'absent';
  };

  const filteredEmployees = employees?.filter(emp => {
    // 1. Search Filter
    const matchesSearch =
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Status Filter
    if (statusFilter === 'all') return true;

    const status = getEmployeeDailyStatus(emp.user_id);

    // Special handling for the current logged-in HR user - they are always present
    if (emp.user_id === session?.user?.id) return statusFilter === 'present';

    return status === statusFilter;
  }) || [];

  const getAttendanceStatus = (userId: string) => {
    // Check if on leave first (highest priority)
    if (todayLeaveStatus?.[userId]) {
      return { type: 'leave', color: 'bg-blue-500', icon: 'plane' };
    }

    // Check attendance status
    const attendanceStatus = todayAttendance?.[userId];
    if (attendanceStatus) {
      switch (attendanceStatus) {
        case 'present':
          return { type: 'present', color: 'bg-green-500', icon: 'circle' };
        case 'absent':
          return { type: 'absent', color: 'bg-red-500', icon: 'circle' };
        case 'late':
          return { type: 'late', color: 'bg-yellow-500', icon: 'circle' };
        case 'half-day':
          return { type: 'half-day', color: 'bg-orange-500', icon: 'circle' };
        default:
          return { type: 'unknown', color: 'bg-gray-500', icon: 'circle' };
      }
    }

    // Special logic for HR users: if they're logged in and viewing the dashboard, consider them present
    if (isHR && userId === session?.user?.id) {
      return { type: 'present', color: 'bg-green-500', icon: 'circle' };
    }

    // No attendance record - assume absent for other users in HR dashboard
    if (isHR) {
      return { type: 'absent', color: 'bg-red-500', icon: 'circle' };
    }

    return { type: 'unknown', color: 'bg-gray-500', icon: 'circle' };
  };

  const toggleEmployeeSelection = (id: string) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleDeleteEmployee = (employee: { id: string; name: string }) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteEmployee = () => {
    if (employeeToDelete) {
      deleteEmployee.mutate(employeeToDelete.id);
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setEmployeeToDelete(null);
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <DashboardLayout title="Employees" subtitle="Manage your team members and their information">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value: 'all' | 'present' | 'absent' | 'leave') => setStatusFilter(value)}
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="All Employees" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              <SelectItem value="present">Present Today</SelectItem>
              <SelectItem value="absent">Absent Today</SelectItem>
              <SelectItem value="leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isHR && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                + New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>
                  Create a login for a new employee (public sign up is disabled).
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input
                    id="full_name"
                    value={newEmployee.full_name}
                    onChange={(e) => setNewEmployee((p) => ({ ...p, full_name: e.target.value }))}
                    placeholder="Employee name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee((p) => ({ ...p, email: e.target.value }))}
                    placeholder="employee@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Temporary password</Label>
                  <Input
                    id="password"
                    type="text"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Set a temporary password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Share these credentials with the employee. They can change password later.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isCreating || !newEmployee.email || !newEmployee.password || !newEmployee.full_name}
                  onClick={async () => {
                    if (!session?.access_token) {
                      toast({
                        title: 'Not signed in',
                        description: 'Please sign in again and try.',
                        variant: 'destructive',
                      });
                      return;
                    }

                    setIsCreating(true);
                    try {
                      // Create Supabase admin client
                      const supabaseAdmin = createClient(
                        import.meta.env.VITE_SUPABASE_URL,
                        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iZXJ1enRqZXppb3N6dGh3aXNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQxODkxNywiZXhwIjoyMDgyOTk0OTE3fQ.W0hEmhon4Zc5hWWpyuvzBfo9EwlMurX4uaaSyBMzhYQ',
                        {
                          auth: {
                            autoRefreshToken: false,
                            persistSession: false
                          }
                        }
                      );

                      // 1. Create user in Supabase Auth
                      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                        email: newEmployee.email,
                        password: newEmployee.password,
                        email_confirm: true,
                        user_metadata: {
                          full_name: newEmployee.full_name
                        }
                      });

                      if (authError) {
                        if (authError.message.includes('already registered')) {
                          throw new Error('A user with this email already exists');
                        }
                        throw new Error(authError.message);
                      }

                      const userId = authData.user.id;

                      // 2. Create profile record
                      const { error: profileError } = await supabaseAdmin
                        .from('profiles')
                        .insert({
                          user_id: userId,
                          email: newEmployee.email,
                          full_name: newEmployee.full_name,
                          status: 'active',
                          join_date: new Date().toISOString().split('T')[0],
                          remaining_annual_leave: 21,
                          remaining_sick_leave: 10
                        });

                      if (profileError) {
                        console.error('Profile creation error:', profileError);
                        // Continue anyway - user was created
                      }

                      // 3. Assign employee role
                      const { error: roleError } = await supabaseAdmin
                        .from('user_roles')
                        .insert({
                          user_id: userId,
                          role: 'employee'
                        });

                      if (roleError) {
                        console.error('Role assignment error:', roleError);
                        // Continue anyway - user was created
                      }

                      toast({
                        title: 'Employee created',
                        description: `${newEmployee.full_name} can now log in with the credentials you set.`,
                      });

                      setIsAddDialogOpen(false);
                      setNewEmployee({ full_name: '', email: '', password: '' });
                      queryClient.invalidateQueries({ queryKey: ['profiles'] });
                    } catch (e: any) {
                      toast({
                        title: 'Create failed',
                        description: e?.message || 'Please try again.',
                        variant: 'destructive',
                      });
                    } finally {
                      setIsCreating(false);
                    }
                  }}
                >
                  {isCreating ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Employee Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map((emp) => (
            <HoverCard key={emp.id} openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <Card className="relative group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30">
                  {/* Selection Checkbox */}
                  <div className="absolute top-3 right-3 z-10">
                    <CheckboxUI
                      checked={selectedEmployees.includes(emp.id)}
                      onCheckedChange={() => toggleEmployeeSelection(emp.id)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  {/* Status Indicator */}
                  <div className="absolute top-3 left-3 z-10">
                    {isHR ? (
                      // Show attendance status for HR users
                      (() => {
                        const attendanceStatus = getAttendanceStatus(emp.user_id);
                        return attendanceStatus.icon === 'plane' ? (
                          <div
                            className={`${attendanceStatus.color.replace('bg-', 'text-')} ring-2 ring-background shadow-sm rounded`}
                            title="On Leave"
                          >
                            <Plane className="h-4 w-4" />
                          </div>
                        ) : (
                          <div
                            className={`h-3 w-3 rounded-full ${attendanceStatus.color} ring-2 ring-background shadow-sm`}
                            title={attendanceStatus.type.charAt(0).toUpperCase() + attendanceStatus.type.slice(1)}
                          />
                        );
                      })()
                    ) : (
                      // Show employment status for employees
                      <div
                        className={`h-3 w-3 rounded-full ${getStatusIndicatorColor(emp.status || undefined)} ring-2 ring-background shadow-sm`}
                        title={emp.status === 'active' ? 'Active' : 'Inactive'}
                      />
                    )}
                  </div>

                  <CardContent className="p-5">
                    {/* Profile Picture */}
                    <div className="flex flex-col items-center text-center mb-4">
                      <ProfilePictureUpload
                        currentAvatarUrl={emp.avatar_url || undefined}
                        userId={emp.user_id}
                        fullName={emp.full_name}
                        size="md"
                        editable={isHR || emp.user_id === session?.user?.id}
                      />
                      <h3 className="font-semibold text-foreground">{emp.full_name}</h3>
                      <p className="text-xs text-muted-foreground">{emp.email}</p>
                    </div>

                    {/* Role & Department */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Role</span>
                        <span className="font-medium">{emp.position || 'Not assigned'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Dept</span>
                        <span className="font-medium">{emp.department || 'Not assigned'}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-4 flex justify-center">
                      <StatusBadge status={emp.status as 'active' | 'inactive' || 'active'} />
                    </div>
                  </CardContent>

                  {/* Actions on main card */}
                  <div className="absolute top-3 right-12 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem>Edit Details</DropdownMenuItem>
                        <DropdownMenuItem>Send Email</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => {
                            setTimeout(() => {
                              handleDeleteEmployee({ id: emp.user_id, name: emp.full_name });
                            }, 100);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Employee
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              </HoverCardTrigger>

              {/* Hover Card with Details */}
              <HoverCardContent className="w-72" side="right" align="start">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <ProfilePictureUpload
                      currentAvatarUrl={emp.avatar_url || undefined}
                      userId={emp.user_id}
                      fullName={emp.full_name}
                      size="sm"
                      editable={isHR || emp.user_id === session?.user?.id}
                    />
                    <div>
                      <p className="font-semibold">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground">{emp.position}</p>
                    </div>
                  </div>

                  {/* Leave Balance */}
                  <div className="pt-2 border-t space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Leave Balance</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground text-xs">Annual</span>
                        <p className="font-semibold">{emp.remaining_annual_leave || 0} days</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground text-xs">Sick</span>
                        <p className="font-semibold">{emp.remaining_sick_leave || 0} days</p>
                      </div>
                    </div>
                  </div>

                  {/* Salary */}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Salary</span>
                      <span className="font-semibold">{formatCurrency(emp.salary)}</span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    {emp.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{emp.phone}</span>
                      </div>
                    )}
                    {emp.join_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Joined {format(new Date(emp.join_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/employees/${emp.user_id}`)}
                    >
                      View Profile
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-2"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem>Edit Details</DropdownMenuItem>
                        <DropdownMenuItem>Send Email</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => {
                            setTimeout(() => {
                              handleDeleteEmployee({ id: emp.user_id, name: emp.full_name });
                            }, 100);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Employee
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No employees found matching your search.</p>
        </div>
      )}

      {/* Delete Employee Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Employee
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{employeeToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <h4 className="font-medium text-destructive mb-2">This will permanently delete:</h4>
              <ul className="text-sm text-destructive space-y-1">
                <li>• Employee profile and personal information</li>
                <li>• All attendance records</li>
                <li>• Leave request history</li>
                <li>• Payroll records</li>
                <li>• User account and authentication data</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={cancelDelete}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteEmployee}
                disabled={deleteEmployee.isPending}
              >
                {deleteEmployee.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Employee
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
