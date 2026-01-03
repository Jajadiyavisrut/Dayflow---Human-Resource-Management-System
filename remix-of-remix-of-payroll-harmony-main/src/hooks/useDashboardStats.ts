import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export function useDashboardStats() {
  const { user, session } = useAuth();
  const isHR = user?.role === 'hr';
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['dashboard-stats', isHR, session?.user?.id],
    queryFn: async () => {
      if (isHR) {
        // HR Dashboard Stats
        const [
          { count: totalEmployees },
          { data: todayAttendance },
          { data: pendingLeaves },
          { data: totalSalary },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('attendance').select('*').eq('date', today),
          supabase.from('leave_requests').select('*').eq('status', 'pending'),
          supabase.from('profiles').select('salary'),
        ]);

        const presentToday = todayAttendance?.filter(a => a.status === 'present' || a.status === 'late').length || 0;
        const monthlyPayroll = totalSalary?.reduce((sum, p) => sum + (p.salary || 0), 0) || 0;

        return {
          totalEmployees: totalEmployees || 0,
          presentToday,
          attendanceRate: totalEmployees ? Math.round((presentToday / totalEmployees) * 100) : 0,
          pendingLeaves: pendingLeaves?.length || 0,
          monthlyPayroll,
        };
      } else {
        // Employee Dashboard Stats
        if (!session?.user?.id) return null;

        const [
          { data: profile },
          { data: myAttendance },
          { data: myPendingLeaves },
        ] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle(),
          supabase.from('attendance').select('*').eq('user_id', session.user.id),
          supabase.from('leave_requests').select('*').eq('user_id', session.user.id).eq('status', 'pending'),
        ]);

        const presentDays = myAttendance?.filter(a => a.status === 'present' || a.status === 'late').length || 0;
        const totalDays = myAttendance?.length || 1;

        return {
          remainingAnnualLeave: profile?.remaining_annual_leave || 0,
          remainingSickLeave: profile?.remaining_sick_leave || 0,
          salary: profile?.salary || 0,
          attendanceRate: Math.round((presentDays / totalDays) * 100),
          pendingRequests: myPendingLeaves?.length || 0,
          daysPresent: presentDays,
        };
      }
    },
    enabled: !!session?.user?.id,
  });
}
