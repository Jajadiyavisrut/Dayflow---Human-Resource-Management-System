import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    remaining_annual_leave: number | null;
    remaining_sick_leave: number | null;
    avatar_url: string | null;
  };
}

export function useLeaveRequests(statusFilter?: string) {
  const { user, session } = useAuth();
  const isHR = user?.role === 'hr';

  return useQuery({
    queryKey: ['leave-requests', isHR, session?.user?.id, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isHR && session?.user?.id) {
        query = query.eq('user_id', session.user.id);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: leaveData, error } = await query;

      if (error) throw error;
      if (!leaveData) return [];

      // Fetch profiles for the leave requests
      const userIds = [...new Set(leaveData.map(l => l.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, remaining_annual_leave, remaining_sick_leave, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return leaveData.map(l => ({
        ...l,
        profile: profileMap.get(l.user_id) || undefined,
      })) as LeaveRequest[];
    },
    enabled: !!session?.user?.id,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (request: {
      leave_type: string;
      start_date: string;
      end_date: string;
      days: number;
      reason?: string;
    }) => {
      if (!session?.user?.id) throw new Error('Not authenticated');

      // Check if user has enough leave days available
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('remaining_annual_leave, remaining_sick_leave')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) throw profileError;

      const availableDays = request.leave_type === 'vacation'
        ? (profile?.remaining_annual_leave || 0)
        : (profile?.remaining_sick_leave || 0);

      if (request.days > availableDays) {
        const leaveTypeName = request.leave_type === 'vacation' ? 'Annual Leave' : 'Sick Leave';
        throw new Error(`Insufficient ${leaveTypeName} days. You have ${availableDays} days available but requested ${request.days} days.`);
      }

      console.log('Creating leave request with data:', {
        ...request,
        user_id: session.user.id,
        status: 'pending',
      });

      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          ...request,
          user_id: session.user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      console.log('Leave request created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast({
        title: 'Leave Request Submitted',
        description: 'Your request has been sent for approval.',
      });
    },
    onError: (error) => {
      console.error('Leave request creation error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to submit leave request.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateLeaveStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      if (!session?.user?.id) throw new Error('Not authenticated');

      // First get the leave request details to know how many days to deduct
      const { data: leaveRequest, error: fetchError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update the leave request status
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status,
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // If approved, deduct leave days from the user's profile
      if (status === 'approved' && leaveRequest) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('remaining_annual_leave, remaining_sick_leave')
          .eq('user_id', leaveRequest.user_id)
          .single();

        if (profileError) throw profileError;

        const updates: any = {};

        if (leaveRequest.leave_type === 'vacation') {
          updates.remaining_annual_leave = (profile?.remaining_annual_leave || 0) - leaveRequest.days;
        } else if (leaveRequest.leave_type === 'sick') {
          updates.remaining_sick_leave = (profile?.remaining_sick_leave || 0) - leaveRequest.days;
        }

        // Update the profile with deducted leave days
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('user_id', leaveRequest.user_id);

        if (updateError) throw updateError;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      toast({
        title: variables.status === 'approved' ? 'Leave Approved' : 'Leave Rejected',
        description: variables.status === 'approved'
          ? 'The leave request has been approved and leave days have been deducted.'
          : 'The leave request has been rejected.',
        variant: variables.status === 'approved' ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update leave status.',
        variant: 'destructive',
      });
    },
  });
}
