import { Bell, Search, ChevronDown, LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useMyProfile } from '@/hooks/useProfiles';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user, logout, toggleViewAs } = useAuth();
  const navigate = useNavigate();
  const { data: myProfile } = useMyProfile();
  // Fetch pending requests for notification count
  // We only show notifications for HR about all requests, or for Employee about their own statuses (but current hook logic for pending is fine to start)
  // For HR View: Show 'pending' requests from all users
  const isHRView = user?.viewAs === 'hr';

  // We can pass 'pending' to filter, but the hook might need 'all' status then filter manually if needed?
  // Let's check hook: useLeaveRequests(statusFilter). If we pass 'pending', it returns pending requests.
  // Note: If viewAs is employee, we still might want to see user's own pending requests? 
  // User asked for "Real time notification numbers". Usually for HR it's "Needs Approval".

  const { data: pendingRequests, isLoading: isPending } = useLeaveRequests('pending');

  const pendingCount = pendingRequests?.length || 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isPending ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : pendingCount > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {pendingRequests?.map((request: any) => (
                  <div key={request.id} className="p-3 border-b last:border-0 hover:bg-muted/50">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{request.profile?.full_name || 'Unknown User'}</span>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(request.created_at), 'MMM d')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      Requested {request.days} day(s) of {request.leave_type === 'vacation' ? 'Annual Leave' : request.leave_type === 'sick' ? 'Sick Leave' : 'Leave'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No new notifications
              </div>
            )}

          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={myProfile?.avatar_url || undefined} alt={user?.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.viewAs || user?.role || 'employee'}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              Profile Settings
            </DropdownMenuItem>

            {/* Role Switcher for HR */}
            {user?.role === 'hr' && (
              <DropdownMenuItem onClick={toggleViewAs} className="cursor-pointer">
                <RefreshCw className="mr-2 h-4 w-4" />
                Switch to {user.viewAs === 'hr' ? 'Employee' : 'HR'} View
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Current View
            </DropdownMenuLabel>
            <div className="px-2 py-1.5">
              <Badge variant={user?.viewAs === 'hr' ? 'default' : 'secondary'} className="capitalize">
                {user?.viewAs || user?.role || 'employee'}
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
