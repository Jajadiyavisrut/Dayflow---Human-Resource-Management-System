import { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfilePictureUpload } from '@/hooks/useProfilePictureUpload';

interface ProfilePictureUploadProps {
    currentAvatarUrl?: string;
    userId: string;
    fullName: string;
    size?: 'sm' | 'md' | 'lg';
    editable?: boolean;
}

export function ProfilePictureUpload({
    currentAvatarUrl,
    userId,
    fullName,
    size = 'md',
    editable = true
}: ProfilePictureUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const uploadPicture = useProfilePictureUpload();

    const sizeClasses = {
        sm: 'h-8 w-8',
        md: 'h-16 w-16',
        lg: 'h-24 w-24'
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type and size
            if (!file.type.startsWith('image/')) {
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                return;
            }
            uploadPicture.mutate({ file, userId });
        }
    };

    const handleClick = () => {
        if (editable) {
            fileInputRef.current?.click();
        }
    };

    return (
        <div className="relative">
            <Avatar
                className={`${sizeClasses[size]} cursor-pointer transition-all duration-200 ${isHovered && editable ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                onClick={handleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <AvatarImage src={currentAvatarUrl} alt={fullName} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-lg font-semibold text-primary">
                    {fullName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
            </Avatar>

            {editable && (
                <>
                    {isHovered && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer">
                            <Camera className="h-6 w-6 text-white" />
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </>
            )}
        </div>
    );
}
