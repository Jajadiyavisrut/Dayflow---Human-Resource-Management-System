import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  status: string | null;
  salary: number | null;
  join_date: string | null;
  remaining_annual_leave: number | null;
  remaining_sick_leave: number | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfiles() {
  const { user } = useAuth();
  const isHR = user?.role === 'hr';

  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      return data as Profile[];
    },
    enabled: isHR,
  });
}

export function useMyProfile() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['my-profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!session?.user?.id,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<Profile> }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      toast({
        title: 'Profile Updated',
        description: 'Profile has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, file }: { userId: string; file: File }) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB in bytes
      if (file.size > maxSize) {
        throw new Error('Image size must be less than 2MB');
      }

      // Convert image to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Update profile with base64 avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: base64 })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return base64;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast({
        title: 'Avatar Updated',
        description: 'Your profile picture has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload avatar. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

