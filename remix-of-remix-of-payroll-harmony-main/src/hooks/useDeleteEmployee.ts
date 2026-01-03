import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useDeleteEmployee() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { session } = useAuth();

    return useMutation({
        mutationFn: async (userId: string) => {
            if (!session?.user?.id) throw new Error('Not authenticated');

            // Create admin client for auth operations
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

            // First, delete related records in order (due to foreign key constraints)
            const deleteErrors: string[] = [];

            try {
                // Delete attendance records
                const { error: attendanceError } = await supabase
                    .from('attendance')
                    .delete()
                    .eq('user_id', userId);

                if (attendanceError) {
                    deleteErrors.push(`Attendance: ${attendanceError.message}`);
                }
            } catch (error) {
                deleteErrors.push(`Attendance: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            try {
                // Delete leave requests
                const { error: leaveError } = await supabase
                    .from('leave_requests')
                    .delete()
                    .eq('user_id', userId);

                if (leaveError) {
                    deleteErrors.push(`Leave Requests: ${leaveError.message}`);
                }
            } catch (error) {
                deleteErrors.push(`Leave Requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            try {
                // Delete user role
                const { error: roleError } = await supabase
                    .from('user_roles')
                    .delete()
                    .eq('user_id', userId);

                if (roleError) {
                    deleteErrors.push(`User Role: ${roleError.message}`);
                }
            } catch (error) {
                deleteErrors.push(`User Role: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            try {
                // Delete profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .delete()
                    .eq('user_id', userId);

                if (profileError) {
                    deleteErrors.push(`Profile: ${profileError.message}`);
                }
            } catch (error) {
                deleteErrors.push(`Profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            try {
                // Finally, delete the auth user (this requires admin privileges)
                const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

                if (authError) {
                    deleteErrors.push(`Auth User: ${authError.message}`);
                }
            } catch (error) {
                deleteErrors.push(`Auth User: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            // If there were any errors, throw them
            if (deleteErrors.length > 0) {
                throw new Error(`Failed to delete some records: ${deleteErrors.join(', ')}`);
            }

            return { success: true, userId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['recent-activities'] });

            toast({
                title: 'Employee Deleted',
                description: 'The employee and all related data have been successfully removed.',
            });
        },
        onError: (error) => {
            console.error('Employee deletion error:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to delete employee. Please try again.',
                variant: 'destructive',
            });
        },
    });
}
