import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, Building2, Calendar, Edit2, Save, X, Camera, ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles, useUpdateProfile, useUploadAvatar } from '@/hooks/useProfiles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function EmployeeProfile() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user, session } = useAuth();
    const { toast } = useToast();
    const isHR = user?.role === 'hr';

    const { data: profile, isLoading } = useProfiles();
    const updateProfile = useUpdateProfile();
    const uploadAvatar = useUploadAvatar();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const employeeProfile = profile?.find(emp => emp.user_id === userId);

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        status: '',
        salary: '',
    });

    // Initialize form data when profile loads
    useState(() => {
        if (employeeProfile) {
            setFormData({
                full_name: employeeProfile.full_name || '',
                email: employeeProfile.email || '',
                phone: employeeProfile.phone || '',
                department: employeeProfile.department || '',
                position: employeeProfile.position || '',
                status: employeeProfile.status || '',
                salary: employeeProfile.salary?.toString() || '',
            });
        }
    });

    const handleSave = () => {
        if (!userId) return;

        updateProfile.mutate({
            userId,
            updates: {
                full_name: formData.full_name,
                phone: formData.phone,
                department: formData.department,
                position: formData.position,
                status: formData.status,
                salary: formData.salary ? parseFloat(formData.salary) : null,
            },
        });
        setIsEditing(false);
    };

    const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && userId) {
            uploadAvatar.mutate({ userId, file });
        }
    };

    if (!isHR) {
        navigate('/employees');
        return null;
    }

    if (isLoading) {
        return (
            <DashboardLayout title="Employee Profile" subtitle="Loading...">
                <div className="space-y-6">
                    <Skeleton className="h-32 w-32 rounded-full" />
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-64" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!employeeProfile) {
        return (
            <DashboardLayout title="Employee Profile" subtitle="Employee not found">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Employee profile not found.</p>
                    <Button onClick={() => navigate('/employees')} className="mt-4">
                        Back to Employees
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title={`${employeeProfile.full_name}'s Profile`} subtitle="Manage employee information">
            <div className="space-y-6">
                {/* Back Button */}
                <Button variant="outline" onClick={() => navigate('/employees')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Employees
                </Button>

                {/* Profile Header */}
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <Avatar className="h-32 w-32">
                            <AvatarImage src={employeeProfile.avatar_url || undefined} alt={employeeProfile.full_name} />
                            <AvatarFallback className="text-2xl">
                                {employeeProfile.full_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                        </Avatar>
                        {isEditing && (
                            <Button
                                size="sm"
                                className="absolute bottom-0 right-0"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Camera className="h-4 w-4" />
                            </Button>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                        />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                            <h1 className="text-2xl font-bold">{employeeProfile.full_name}</h1>
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleSave} disabled={updateProfile.isPending}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit
                                </Button>
                            )}
                        </div>
                        <p className="text-muted-foreground">{employeeProfile.position}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className={`px-2 py-1 rounded-full text-xs ${employeeProfile.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {employeeProfile.status}
                            </span>
                            {employeeProfile.join_date && (
                                <span>Joined {format(new Date(employeeProfile.join_date), 'MMM d, yyyy')}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Profile Details */}
                <Tabs defaultValue="personal" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="personal">Personal Info</TabsTrigger>
                        <TabsTrigger value="work">Work Details</TabsTrigger>
                        <TabsTrigger value="leave">Leave Balance</TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                {isEditing ? (
                                    <Input
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                ) : (
                                    <p className="text-sm">{employeeProfile.full_name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Email</Label>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm">{employeeProfile.email}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Phone</Label>
                                {isEditing ? (
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="Add phone number"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-sm">{employeeProfile.phone || 'Not added'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="work" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Department</Label>
                                {isEditing ? (
                                    <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Engineering">Engineering</SelectItem>
                                            <SelectItem value="Sales">Sales</SelectItem>
                                            <SelectItem value="Marketing">Marketing</SelectItem>
                                            <SelectItem value="HR">Human Resources</SelectItem>
                                            <SelectItem value="Finance">Finance</SelectItem>
                                            <SelectItem value="Operations">Operations</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-sm">{employeeProfile.department || 'Not assigned'}</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Position</Label>
                                {isEditing ? (
                                    <Input
                                        value={formData.position}
                                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                        placeholder="Job title"
                                    />
                                ) : (
                                    <p className="text-sm">{employeeProfile.position || 'Not assigned'}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                {isEditing ? (
                                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <span className={`px-2 py-1 rounded-full text-xs ${employeeProfile.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {employeeProfile.status}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Salary (INR)</Label>
                                {isEditing ? (
                                    <Input
                                        type="number"
                                        value={formData.salary}
                                        onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                        placeholder="Annual salary"
                                    />
                                ) : (
                                    <p className="text-sm">
                                        {employeeProfile.salary ? new Intl.NumberFormat('en-IN', {
                                            style: 'currency',
                                            currency: 'INR',
                                            maximumFractionDigits: 0,
                                        }).format(employeeProfile.salary) : 'Not set'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="leave" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className={`bg-muted/50 rounded-lg p-4 border-2 ${(employeeProfile.remaining_annual_leave || 0) > 10
                                    ? 'border-green-200 bg-green-50'
                                    : (employeeProfile.remaining_annual_leave || 0) > 5
                                        ? 'border-yellow-200 bg-yellow-50'
                                        : 'border-red-200 bg-red-50'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-medium">Annual Leave</h3>
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-2xl font-bold">{employeeProfile.remaining_annual_leave || 0}</p>
                                <p className="text-sm text-muted-foreground">days remaining</p>
                                {(employeeProfile.remaining_annual_leave || 0) <= 5 && (
                                    <p className="text-xs text-red-600 mt-2">⚠️ Low leave balance</p>
                                )}
                            </div>

                            <div className={`bg-muted/50 rounded-lg p-4 border-2 ${(employeeProfile.remaining_sick_leave || 0) > 5
                                    ? 'border-green-200 bg-green-50'
                                    : (employeeProfile.remaining_sick_leave || 0) > 2
                                        ? 'border-yellow-200 bg-yellow-50'
                                        : 'border-red-200 bg-red-50'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-medium">Sick Leave</h3>
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-2xl font-bold">{employeeProfile.remaining_sick_leave || 0}</p>
                                <p className="text-sm text-muted-foreground">days remaining</p>
                                {(employeeProfile.remaining_sick_leave || 0) <= 2 && (
                                    <p className="text-xs text-red-600 mt-2">⚠️ Low leave balance</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                                💡 <strong>Note:</strong> Leave days are automatically deducted when requests are approved.
                                Requesting more days than available will be blocked.
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
