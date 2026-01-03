import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useProfilePictureUpload() {
    const queryClient = useQueryClient();
    const { session } = useAuth();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ file, userId }: { file: File; userId: string }) => {
            if (!session?.user?.id) throw new Error('Not authenticated');

            // Generate unique file name
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // Upload file to Supabase Storage
            const { error: uploadError, data: uploadData } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('user_id', userId);

            if (updateError) throw updateError;

            return publicUrl;
        },
        onSuccess: (newAvatarUrl) => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            toast({
                title: 'Profile picture updated',
                description: 'Your profile picture has been successfully updated.',
            });
        },
        onError: (error) => {
            console.error('Profile picture upload error:', error);
            toast({
                title: 'Upload failed',
                description: error instanceof Error ? error.message : 'Failed to upload profile picture. Please try again.',
                variant: 'destructive',
            });
        },
    });
}
