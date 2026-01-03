import { useState, useRef } from 'react';
import { Mail, Phone, MapPin, Building2, Calendar, Edit2, Save, X, Camera, Plus, FileText, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile, useUpdateProfile, useUploadAvatar } from '@/hooks/useProfiles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

export default function Profile() {
  const { user, session } = useAuth();
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  // Initialize form data when profile loads
  useState(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
  });

  const handleSave = () => {
    if (!session?.user?.id) return;

    updateProfile.mutate({
      userId: session.user.id,
      updates: {
        full_name: formData.full_name,
        phone: formData.phone,
      },
    });
    setIsEditing(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && session?.user?.id) {
      uploadAvatar.mutate({ userId: session.user.id, file });
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="My Profile" subtitle="View and manage your personal information">
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96" />
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Profile" subtitle="View and manage your personal information">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="text-center">
              <div className="relative inline-block">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
                  <AvatarFallback className="text-3xl font-semibold bg-primary/10 text-primary">
                    {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={uploadAvatar.isPending}
                  className="absolute bottom-3 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <h2 className="text-xl font-semibold">{profile?.full_name}</h2>
              <p className="text-muted-foreground">{profile?.position || 'Not assigned'}</p>
              <p className="text-sm text-primary mt-1 capitalize">{user?.role}</p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.department || 'Not assigned'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Joined {profile?.join_date ? format(new Date(profile.join_date), 'MMM d, yyyy') : 'N/A'}</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={() => {
                if (isEditing) {
                  setFormData({
                    full_name: profile?.full_name || '',
                    email: profile?.email || '',
                    phone: profile?.phone || '',
                  });
                } else {
                  setFormData({
                    full_name: profile?.full_name || '',
                    email: profile?.email || '',
                    phone: profile?.phone || '',
                  });
                }
                setIsEditing(!isEditing);
              }}
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </>
              )}
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="bg-card rounded-xl border border-border p-6 mt-6">
            <h3 className="font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Remaining Annual Leave</span>
                <span className="font-medium text-primary">{profile?.remaining_annual_leave || 0} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Remaining Sick Leave</span>
                <span className="font-medium text-info">{profile?.remaining_sick_leave || 0} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Monthly Salary</span>
                <span className="font-medium text-success">{formatCurrency(profile?.salary)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Status</span>
                <span className="font-medium capitalize">{profile?.status || 'Active'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold mb-6">Personal Information</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={isEditing ? formData.full_name : profile?.full_name || ''}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={isEditing ? formData.phone : profile?.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
                {isEditing && (
                  <div className="flex justify-end mt-6">
                    <Button onClick={handleSave} disabled={updateProfile.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="employment">
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold mb-6">Employment Details</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input value={profile?.department || 'Not assigned'} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Input value={profile?.position || 'Not assigned'} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Join Date</Label>
                    <Input
                      value={profile?.join_date ? format(new Date(profile.join_date), 'MMMM d, yyyy') : 'N/A'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Input value={profile?.status || 'Active'} disabled className="bg-muted capitalize" />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Salary</Label>
                    <Input value={formatCurrency(profile?.salary)} disabled className="bg-muted" />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold">Documents</h3>
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('doc-upload')?.click()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload New
                  </Button>
                  <input
                    id="doc-upload"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Simulate upload
                        const newDoc = {
                          id: Date.now(),
                          name: file.name,
                          date: new Date().toISOString(),
                          size: (file.size / 1024).toFixed(2) + ' KB'
                        };
                        setDocuments(prev => [newDoc, ...prev]);
                        toast({
                          title: "Document Uploaded",
                          description: `${file.name} has been successfully uploaded.`
                        });
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  {documents.length > 0 ? (
                    documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(doc.date), 'MMM d, yyyy')} • {doc.size}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDocuments(prev => prev.filter((d: any) => d.id !== doc.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No documents uploaded yet</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
