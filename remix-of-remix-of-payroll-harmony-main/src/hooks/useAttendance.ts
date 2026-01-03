import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    department: string | null;
    avatar_url: string | null;
  };
}

export function useAttendance(month?: string) {
  const { user, session } = useAuth();
  const isHR = user?.role === 'hr';

  return useQuery({
    queryKey: ['attendance', isHR, session?.user?.id, month],
    queryFn: async () => {
      // First get attendance records
      let query = supabase
        .from('attendance')
        .select('*')
        .order('date', { ascending: false });

      if (!isHR && session?.user?.id) {
        query = query.eq('user_id', session.user.id);
      }

      const { data: attendanceData, error } = await query;

      if (error) throw error;
      if (!attendanceData) return [];

      // If HR, fetch all profiles to join
      if (isHR) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, department, avatar_url');
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        return attendanceData.map(a => ({
          ...a,
          work_hours: a.work_hours as string | null,
          profile: profileMap.get(a.user_id) || undefined,
        })) as AttendanceRecord[];
      }

      return attendanceData.map(a => ({
        ...a,
        work_hours: a.work_hours as string | null,
      })) as AttendanceRecord[];
    },
    enabled: !!session?.user?.id,
  });
}

export function useTodayAttendance() {
  const { session } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['today-attendance', session?.user?.id, today],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      return data as AttendanceRecord | null;
    },
    enabled: !!session?.user?.id,
  });
}

export function useTodayAttendanceForAll() {
  const { user, session } = useAuth();
  const isHR = user?.role === 'hr';
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['today-attendance-all', today],
    queryFn: async () => {
      if (!isHR || !session?.user?.id) return {};

      const { data, error } = await supabase
        .from('attendance')
        .select('user_id, status')
        .eq('date', today);

      if (error) throw error;

      // Create a map of user_id -> status
      const statusMap: Record<string, string> = {};
      data?.forEach(record => {
        statusMap[record.user_id] = record.status || 'unknown';
      });

      return statusMap;
    },
    enabled: !!isHR && !!session?.user?.id,
  });
}

export function useTodayLeaveStatus() {
  const { user, session } = useAuth();
  const isHR = user?.role === 'hr';
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['today-leave-status', today],
    queryFn: async () => {
      if (!isHR || !session?.user?.id) return {};

      // Check for approved leave requests that include today
      const { data, error } = await supabase
        .from('leave_requests')
        .select('user_id, start_date, end_date, status')
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today);

      if (error) throw error;

      // Create a map of user_id -> leave status
      const leaveMap: Record<string, boolean> = {};
      data?.forEach(leave => {
        leaveMap[leave.user_id] = true;
      });

      return leaveMap;
    },
    enabled: !!isHR && !!session?.user?.id,
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error('Not authenticated');

      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const checkInTime = now.toISOString();

      // Determine status based on time (late if after 9:30 AM)
      const hour = now.getHours();
      const minute = now.getMinutes();
      const isLate = hour > 9 || (hour === 9 && minute > 30);

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          user_id: session.user.id,
          date: today,
          check_in: checkInTime,
          status: isLate ? 'late' : 'present',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      toast({
        title: 'Checked In',
        description: `You checked in at ${format(new Date(), 'hh:mm a')}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Check-in Failed',
        description: 'Failed to check in. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (attendanceId: string) => {
      if (!session?.user?.id) throw new Error('Not authenticated');

      const checkOutTime = new Date().toISOString();

      const { data, error } = await supabase
        .from('attendance')
        .update({ check_out: checkOutTime })
        .eq('id', attendanceId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      toast({
        title: 'Checked Out',
        description: `You checked out at ${format(new Date(), 'hh:mm a')}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Check-out Failed',
        description: 'Failed to check out. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useManualAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (record: {
      user_id: string;
      date: string;
      check_in: string | null;
      check_out: string | null;
      status: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('attendance')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({
        title: 'Attendance Recorded',
        description: 'Manual attendance entry has been saved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save attendance entry.',
        variant: 'destructive',
      });
    },
  });
}
