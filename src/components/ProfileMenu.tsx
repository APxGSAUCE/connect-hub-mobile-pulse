import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Settings, LogOut, Edit, Save, X, Loader2, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { PermissionMatrix } from "@/components/PermissionBanner";

interface Department {
  id: string;
  name: string;
  description: string;
}

const ProfileMenu = () => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { userRole } = useUserRole();
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    department_id: '',
    status: 'active',
    avatar_url: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      if (data) {
        setProfileData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          position: data.position || '',
          department_id: data.department_id || '',
          status: data.status || 'active',
          avatar_url: data.avatar_url || ''
        });
      }

    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const updateProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .update({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          email: profileData.email,
          phone: profileData.phone,
          position: profileData.position,
          department_id: profileData.department_id === "none" ? null : profileData.department_id || null,
          status: profileData.status,
          avatar_url: profileData.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });

      setIsEditing(false);

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchDepartments();
    }
  }, [user]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset to original data if canceling
      fetchProfile();
    }
    setIsEditing(!isEditing);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingAvatar(true);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('files')
        .upload(`avatars/${fileName}`, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(`avatars/${fileName}`);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      setProfileData(prev => ({ ...prev, avatar_url: publicUrl }));

      toast({
        title: "Success",
        description: "Profile picture updated successfully"
      });

    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload profile picture",
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully"
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(dept => dept.id === departmentId);
    return department ? department.name : 'No department';
  };

  if (loading && !profileData.first_name) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6 px-1 sm:px-0">
      {/* Permission Matrix */}
      {userRole && (
        <PermissionMatrix userRole={userRole} />
      )}

      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Profile Settings</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditToggle}
              disabled={loading}
            >
              {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Profile Header */}
        <div className="flex items-center space-x-4 p-4">
          <div className="relative">
            <Avatar className="w-12 h-12">
              {profileData.avatar_url ? (
                <AvatarImage src={profileData.avatar_url} alt="Profile picture" />
              ) : null}
              <AvatarFallback className="bg-blue-600 text-white">
                {getInitials(profileData.first_name, profileData.last_name)}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <div className="absolute -bottom-1 -right-1">
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                    {uploadingAvatar ? (
                      <Loader2 className="w-3 h-3 text-white animate-spin" />
                    ) : (
                      <Camera className="w-3 h-3 text-white" />
                    )}
                  </div>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">
                  {profileData.first_name && profileData.last_name
                    ? `${profileData.first_name} ${profileData.last_name}`
                    : profileData.email || 'User'
                  }
                </h3>
                <p className="text-sm text-gray-500">{profileData.email}</p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Profile Form */}
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="first_name">First Name</Label>
              {isEditing ? (
                <Input
                  id="first_name"
                  value={profileData.first_name}
                  onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                  disabled={loading}
                />
              ) : (
                <div className="p-2 bg-gray-50 rounded-md min-h-[40px] flex items-center">
                  {profileData.first_name || 'Not set'}
                </div>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="last_name">Last Name</Label>
              {isEditing ? (
                <Input
                  id="last_name"
                  value={profileData.last_name}
                  onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                  disabled={loading}
                />
              ) : (
                <div className="p-2 bg-gray-50 rounded-md min-h-[40px] flex items-center">
                  {profileData.last_name || 'Not set'}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            {isEditing ? (
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                disabled={loading}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded-md min-h-[40px] flex items-center">
                {profileData.email || 'Not set'}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            {isEditing ? (
              <Input
                id="phone"
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                disabled={loading}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded-md min-h-[40px] flex items-center">
                {profileData.phone || 'Not set'}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="position">Position</Label>
            {isEditing ? (
              <Input
                id="position"
                value={profileData.position}
                onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
                disabled={loading}
              />
            ) : (
              <div className="p-2 bg-gray-50 rounded-md min-h-[40px] flex items-center">
                {profileData.position || 'Not set'}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="department">Department</Label>
            {isEditing ? (
              <Select
                value={profileData.department_id || "none"}
                onValueChange={(value) => setProfileData({ ...profileData, department_id: value === "none" ? "" : value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-2 bg-gray-50 rounded-md min-h-[40px] flex items-center">
                {getDepartmentName(profileData.department_id)}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleEditToggle} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={updateProfile} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}

        <Separator />

        {/* Sign Out Button */}
        <div className="flex justify-center">
          <Button variant="destructive" onClick={handleSignOut} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};

export default ProfileMenu;