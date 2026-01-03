import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface LeaveRequest {
    id: string;
    user_id: string;
    start_date: string;
    end_date: string;
    leave_type: 'annual' | 'sick' | 'unpaid' | 'maternity' | 'paternity';
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    days: number;
    approved_by?: string;
    approved_at?: string;
    rejection_reason?: string;
    created_at: string;
    profile?: {
        full_name: string;
        email: string;
        department: string;
    };
}

export function useLeaveRequests() {
    const { user, session } = useAuth();
    const isHR = user?.role === 'hr';

    return useQuery({
        queryKey: ['leave-requests', isHR, session?.user?.id],
        queryFn: async () => {
            if (!session?.user?.id) return [];

            let query = supabase
                .from('leave_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (!isHR) {
                query = query.eq('user_id', session.user.id);
            }

            const { data, error } = await query;

            if (error) throw error;

            // If HR, fetch profiles to join
            if (isHR && data) {
                const userIds = [...new Set(data.map(req => req.user_id))];
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('user_id, full_name, email, department')
                    .in('user_id', userIds);

                const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

                return data.map(req => ({
                    ...req,
                    profile: profileMap.get(req.user_id)
                })) as LeaveRequest[];
            }

            return data as LeaveRequest[];
        },
        enabled: !!session?.user?.id,
    });
}

export function useMyLeaveBalance() {
    const { session } = useAuth();

    return useQuery({
        queryKey: ['my-leave-balance', session?.user?.id],
        queryFn: async () => {
            if (!session?.user?.id) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('remaining_annual_leave, remaining_sick_leave')
                .eq('user_id', session.user.id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!session?.user?.id,
    });
}

export function useApplyLeave() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { session } = useAuth();

    return useMutation({
        mutationFn: async (leaveData: {
            start_date: string;
            end_date: string;
            leave_type: LeaveRequest['leave_type'];
            reason: string;
        }) => {
            if (!session?.user?.id) throw new Error('Not authenticated');

            // Calculate days between start and end date
            const startDate = new Date(leaveData.start_date);
            const endDate = new Date(leaveData.end_date);
            const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            const { data, error } = await supabase
                .from('leave_requests')
                .insert({
                    user_id: session.user.id,
                    start_date: leaveData.start_date,
                    end_date: leaveData.end_date,
                    leave_type: leaveData.leave_type,
                    reason: leaveData.reason,
                    days: days,
                    status: 'pending',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
            queryClient.invalidateQueries({ queryKey: ['my-leave-balance'] });
            toast({
                title: 'Leave Request Submitted',
                description: 'Your leave request has been submitted for approval.',
            });
        },
        onError: (error) => {
            toast({
                title: 'Failed to Submit',
                description: error instanceof Error ? error.message : 'Failed to submit leave request. Please try again.',
                variant: 'destructive',
            });
        },
    });
}

export function useApproveLeave() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { session } = useAuth();

    return useMutation({
        mutationFn: async ({
            requestId,
            status,
            rejectionReason
        }: {
            requestId: string;
            status: 'approved' | 'rejected';
            rejectionReason?: string;
        }) => {
            if (!session?.user?.id) throw new Error('Not authenticated');

            const updateData: any = {
                status,
                approved_by: session.user.id,
                approved_at: new Date().toISOString(),
            };

            if (status === 'rejected' && rejectionReason) {
                updateData.rejection_reason = rejectionReason;
            }

            const { data, error } = await supabase
                .from('leave_requests')
                .update(updateData)
                .eq('id', requestId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
            toast({
                title: `Leave Request ${variables.status === 'approved' ? 'Approved' : 'Rejected'}`,
                description: `The leave request has been ${variables.status}.`,
            });
        },
        onError: (error) => {
            toast({
                title: 'Action Failed',
                description: error instanceof Error ? error.message : 'Failed to process leave request. Please try again.',
                variant: 'destructive',
            });
        },
    });
}

export function useLeaveStatistics() {
    const { user, session } = useAuth();
    const isHR = user?.role === 'hr';

    return useQuery({
        queryKey: ['leave-statistics', isHR, session?.user?.id],
        queryFn: async () => {
            if (!session?.user?.id) return null;

            let query = supabase
                .from('leave_requests')
                .select('status, leave_type');

            if (!isHR) {
                query = query.eq('user_id', session.user.id);
            }

            const { data, error } = await query;

            if (error) throw error;

            const stats = {
                total: data?.length || 0,
                pending: data?.filter(req => req.status === 'pending').length || 0,
                approved: data?.filter(req => req.status === 'approved').length || 0,
                rejected: data?.filter(req => req.status === 'rejected').length || 0,
                byType: {} as Record<string, number>,
            };

            data?.forEach(req => {
                stats.byType[req.leave_type] = (stats.byType[req.leave_type] || 0) + 1;
            });

            return stats;
        },
        enabled: !!session?.user?.id,
    });
}
