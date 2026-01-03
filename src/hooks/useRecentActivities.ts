import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export interface RecentActivity {
    id: string;
    type: 'leave' | 'attendance' | 'payroll' | 'employee' | 'profile';
    user: string;
    user_id: string;
    action: string;
    time: string;
    status: 'pending' | 'completed' | 'failed';
    details?: any;
    created_at: string;
}

export function useRecentActivities(limit: number = 10) {
    const { user } = useAuth();
    const isHR = user?.role === 'hr';

    return useQuery({
        queryKey: ['recent-activities', isHR, limit],
        queryFn: async (): Promise<RecentActivity[]> => {
            const activities: RecentActivity[] = [];

            // 1. Get recent leave requests
            const { data: leaveRequests } = await supabase
                .from('leave_requests')
                .select('*, profiles!inner(full_name)')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (leaveRequests) {
                leaveRequests.forEach((req: any) => {
                    activities.push({
                        id: `leave-${req.id}`,
                        type: 'leave',
                        user: req.profiles.full_name,
                        user_id: req.user_id,
                        action: `requested ${req.leave_type} leave (${req.days} days)`,
                        time: format(new Date(req.created_at), 'MMM d, h:mm a'),
                        status: req.status === 'pending' ? 'pending' :
                            req.status === 'approved' ? 'completed' : 'failed',
                        details: req,
                        created_at: req.created_at,
                    });
                });
            }

            // 2. Get recent attendance records
            const { data: attendance } = await supabase
                .from('attendance')
                .select('*, profiles!inner(full_name)')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (attendance) {
                attendance.forEach((att: any) => {
                    activities.push({
                        id: `attendance-${att.id}`,
                        type: 'attendance',
                        user: att.profiles.full_name,
                        user_id: att.user_id,
                        action: `marked ${att.status}${att.check_in ? ' at ' + format(new Date(att.check_in), 'h:mm a') : ''}`,
                        time: format(new Date(att.created_at), 'MMM d, h:mm a'),
                        status: 'completed',
                        details: att,
                        created_at: att.created_at,
                    });
                });
            }

            // 3. Get recent profile updates (for HR)
            if (isHR) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (profiles) {
                    profiles.forEach((profile: any) => {
                        // Check if this is a new employee (created recently)
                        const createdDate = new Date(profile.created_at);
                        const daysAgo = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

                        if (daysAgo <= 7) {
                            activities.push({
                                id: `employee-${profile.id}`,
                                type: 'employee',
                                user: profile.full_name,
                                user_id: profile.user_id,
                                action: 'joined team',
                                time: format(new Date(profile.created_at), 'MMM d, h:mm a'),
                                status: 'completed',
                                details: profile,
                                created_at: profile.created_at,
                            });
                        }
                    });
                }
            }

            // 4. Get recent profile updates (edits)
            const { data: updatedProfiles } = await supabase
                .from('profiles')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(limit);

            if (updatedProfiles) {
                updatedProfiles.forEach((profile: any) => {
                    // Skip if created_at and updated_at are the same (likely new profile)
                    if (profile.created_at !== profile.updated_at) {
                        const updatedDate = new Date(profile.updated_at);
                        const daysAgo = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);

                        if (daysAgo <= 7) {
                            activities.push({
                                id: `profile-${profile.id}`,
                                type: 'profile',
                                user: profile.full_name,
                                user_id: profile.user_id,
                                action: 'profile updated',
                                time: format(new Date(profile.updated_at), 'MMM d, h:mm a'),
                                status: 'completed',
                                details: profile,
                                created_at: profile.updated_at,
                            });
                        }
                    }
                });
            }

            // Sort all activities by created_at (most recent first) and limit
            return activities
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, limit);
        },
        enabled: !!user,
        refetchInterval: 30000, // Refresh every 30 seconds
    });
}
