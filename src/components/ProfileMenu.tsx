import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Settings, LogOut, Edit3, Save, X, Loader2, Building, Bell, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  department_id: string;
  position: string;
  phone: string;
  status: string;
  role: string;
}

interface Department {
  id: string;
  name: string;
  description: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  event_reminders: boolean;
  message_notifications: boolean;
}

interface PrivacySettings {
  profile_visibility: 'public' | 'private' | 'team_only';
  show_email: boolean;
  show_phone: boolean;
  show_department: boolean;
}

const ProfileMenu = () => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    department_id: '',
    position: '',
    phone: '',
    status: 'active',
    role: 'employee'
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    event_reminders: true,
    message_notifications: true
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profile_visibility: 'team_only',
    show_email: false,
    show_phone: false,
    show_department: true
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchDepartments();
      loadUserSettings();
    }
  }, [user]);

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

  const fetchProfile = async () => {
    if (!user) return;
    
    setFetchingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`*, department:departments(id, name, description)`)
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data.",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        setProfileData({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email || user.email || '',
          department_id: data.department_id || '',
          position: data.position || '',
          phone: data.phone || '',
          status: data.status || 'active',
          role: data.role || 'employee'
        });
      } else {
        setProfileData({
          firstName: user.user_metadata?.first_name || '',
          lastName: user.user_metadata?.last_name || '',
          email: user.email || '',
          department_id: user.user_metadata?.department_id || '',
          position: '',
          phone: '',
          status: 'active',
          role: 'employee'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive"
      });
    } finally {
      setFetchingProfile(false);
    }
  };

  const loadUserSettings = () => {
    // Load from localStorage as a simple implementation
    const savedNotifications = localStorage.getItem(`notifications_${user?.id}`);
    const savedPrivacy = localStorage.getItem(`privacy_${user?.id}`);
    
    if (savedNotifications) {
      setNotificationSettings(JSON.parse(savedNotifications));
    }
    
    if (savedPrivacy) {
      setPrivacySettings(JSON.parse(savedPrivacy));
    }
  };

  const saveUserSettings = async (type: 'notifications' | 'privacy') => {
    if (!user) return;

    try {
      if (type === 'notifications') {
        localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notificationSettings));
      } else {
        localStorage.setItem(`privacy_${user.id}`, JSON.stringify(privacySettings));
      }

      toast({
        title: "Settings Updated",
        description: `${type === 'notifications' ? 'Notification' : 'Privacy'} settings have been saved.`,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive"
      });
    }
  };

  const validateProfile = () => {
    if (!profileData.firstName.trim()) {
      toast({
        title: "Validation Error",
        description: "First name is required.",
        variant: "destructive"
      });
      return false;
    }

    if (!profileData.lastName.trim()) {
      toast({
        title: "Validation Error",
        description: "Last name is required.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!validateProfile()) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: profileData.firstName.trim(),
          last_name: profileData.lastName.trim(),
          email: profileData.email,
          department_id: profileData.department_id || null,
          position: profileData.position.trim() || null,
          phone: profileData.phone.trim() || null,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again.",
          variant: "destructive"
        });
      } else {
        setIsEditing(false);
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    fetchProfile();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      navigate("/auth");
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    if (!firstName && !lastName) {
      return user?.email?.slice(0, 2).toUpperCase() || 'U';
    }
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'muted': return 'bg-yellow-100 text-yellow-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDepartmentName = () => {
    if (!profileData.department_id) return 'No department assigned';
    const dept = departments.find(d => d.id === profileData.department_id);
    return dept?.name || 'Unknown department';
  };

  if (fetchingProfile) {
    return (
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? "outline" : "default"}
          disabled={loading}
        >
          {isEditing ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Profile
            </>
          )}
        </Button>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-6">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                {getInitials(profileData.firstName, profileData.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">
                {profileData.firstName || profileData.lastName 
                  ? `${profileData.firstName} ${profileData.lastName}`.trim()
                  : 'User'
                }
              </h3>
              <p className="text-gray-600">{profileData.position || 'No position set'}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge className={getRoleColor(profileData.role)} variant="secondary">
                  {profileData.role}
                </Badge>
                <Badge className={getStatusColor(profileData.status)} variant="secondary">
                  {profileData.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Personal Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              {isEditing ? (
                <Input
                  id="firstName"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  disabled={loading}
                />
              ) : (
                <p className="text-gray-900 font-medium">{profileData.firstName || 'Not set'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              {isEditing ? (
                <Input
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  disabled={loading}
                />
              ) : (
                <p className="text-gray-900 font-medium">{profileData.lastName || 'Not set'}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <p className="text-gray-900 font-medium">{profileData.email}</p>
            <p className="text-xs text-gray-500">Email cannot be changed here</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              {isEditing ? (
                <Select
                  value={profileData.department_id}
                  onValueChange={(value) => setProfileData({ ...profileData, department_id: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-gray-900 font-medium">{getDepartmentName()}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              {isEditing ? (
                <Input
                  id="position"
                  value={profileData.position}
                  onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
                  disabled={loading}
                  placeholder="Your job title"
                />
              ) : (
                <p className="text-gray-900 font-medium">{profileData.position || 'Not set'}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            {isEditing ? (
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                disabled={loading}
                placeholder="Your phone number"
              />
            ) : (
              <p className="text-gray-900 font-medium">{profileData.phone || 'Not set'}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <p className="text-gray-900 font-medium capitalize">{profileData.role}</p>
              <p className="text-xs text-gray-500">Role is managed by administrators</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <p className="text-gray-900 font-medium capitalize">{profileData.status}</p>
              <p className="text-xs text-gray-500">Status is managed by administrators</p>
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={handleCancel} disabled={loading}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
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
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Account Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Notifications Settings */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Notifications</h4>
              <p className="text-sm text-gray-600">Manage your notification preferences</p>
            </div>
            <Dialog open={showNotificationSettings} onOpenChange={setShowNotificationSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Bell className="w-5 h-5" />
                    <span>Notification Settings</span>
                  </DialogTitle>
                  <DialogDescription>
                    Choose how you want to be notified about activities.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <Switch
                      id="email-notifications"
                      checked={notificationSettings.email_notifications}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, email_notifications: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <Switch
                      id="push-notifications"
                      checked={notificationSettings.push_notifications}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, push_notifications: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="event-reminders">Event Reminders</Label>
                    <Switch
                      id="event-reminders"
                      checked={notificationSettings.event_reminders}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, event_reminders: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="message-notifications">Message Notifications</Label>
                    <Switch
                      id="message-notifications"
                      checked={notificationSettings.message_notifications}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, message_notifications: checked })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowNotificationSettings(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    saveUserSettings('notifications');
                    setShowNotificationSettings(false);
                  }}>
                    Save Settings
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Privacy Settings */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Privacy Settings</h4>
              <p className="text-sm text-gray-600">Control your privacy and data sharing</p>
            </div>
            <Dialog open={showPrivacySettings} onOpenChange={setShowPrivacySettings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Privacy Settings</span>
                  </DialogTitle>
                  <DialogDescription>
                    Control who can see your information and how it's shared.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-visibility">Profile Visibility</Label>
                    <Select
                      value={privacySettings.profile_visibility}
                      onValueChange={(value: 'public' | 'private' | 'team_only') =>
                        setPrivacySettings({ ...privacySettings, profile_visibility: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public - Everyone can see</SelectItem>
                        <SelectItem value="team_only">Team Only - Only team members</SelectItem>
                        <SelectItem value="private">Private - Only you can see</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-email">Show Email Address</Label>
                    <Switch
                      id="show-email"
                      checked={privacySettings.show_email}
                      onCheckedChange={(checked) =>
                        setPrivacySettings({ ...privacySettings, show_email: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-phone">Show Phone Number</Label>
                    <Switch
                      id="show-phone"
                      checked={privacySettings.show_phone}
                      onCheckedChange={(checked) =>
                        setPrivacySettings({ ...privacySettings, show_phone: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-department">Show Department</Label>
                    <Switch
                      id="show-department"
                      checked={privacySettings.show_department}
                      onCheckedChange={(checked) =>
                        setPrivacySettings({ ...privacySettings, show_department: checked })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowPrivacySettings(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    saveUserSettings('privacy');
                    setShowPrivacySettings(false);
                  }}>
                    Save Settings
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Sign Out */}
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <h4 className="font-medium text-red-900">Sign Out</h4>
              <p className="text-sm text-red-600">Sign out of your One Ilocos Sur Portal account</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleSignOut} disabled={loading}>
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
