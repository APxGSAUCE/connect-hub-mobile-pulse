import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, UserCheck, UserX, AlertCircle, 
  Clock, CheckCircle, Shield, Settings 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  department_id: string;
  employee_id: string;
  phone: string;
  position: string;
  created_at: string;
}

interface VerificationRequest {
  id: string;
  user_id: string;
  documents: any;
  status: string;
  admin_notes: string;
  created_at: string;
  profiles: UserProfile;
}

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingVerifications, setPendingVerifications] = useState<VerificationRequest[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchPendingVerifications();
      fetchAllUsers();
    }
  }, [user]);

  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      setUserRole(data.role);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchPendingVerifications = async () => {
    try {
      // Since user_verifications table might not be in types yet, we'll use a simpler approach
      // For now, we'll just fetch users with PENDING_VERIFICATION status
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'PENDING_VERIFICATION')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(profile => ({
        id: profile.id,
        user_id: profile.id,
        documents: profile.verification_documents,
        status: 'PENDING_VERIFICATION',
        admin_notes: '',
        created_at: profile.created_at,
        profiles: profile
      }));
      
      setPendingVerifications(transformedData);
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      toast({
        title: "Error",
        description: "Failed to load pending verifications.",
        variant: "destructive"
      });
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationAction = async (
    verificationId: string, 
    userId: string, 
    action: 'approve' | 'reject',
    adminNotes?: string
  ) => {
    try {
      setLoading(true);

      // Update user profile status directly
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          approved_by: user?.id,
          approved_at: action === 'approve' ? new Date().toISOString() : null
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: `User ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      });

      // Refresh data
      fetchPendingVerifications();
      fetchAllUsers();
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} user.`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully.",
      });

      fetchAllUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive"
      });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'dept_head': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PENDING_VERIFICATION': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'SUSPENDED': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (userRole !== 'super_admin' && userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to access this admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header - Mobile optimized */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">Manage users and verification requests</p>
          </div>
          <Badge variant="outline" className="bg-red-50 text-red-700 self-start">
            <Shield className="w-4 h-4 mr-1" />
            {userRole === 'super_admin' ? 'Super Admin' : 'Admin'}
          </Badge>
        </div>
      </div>

      {/* Stats Cards - Mobile optimized grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-600">Pending Verifications</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{pendingVerifications.length}</p>
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-100 rounded-lg flex items-center justify-center ml-2 flex-shrink-0">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-600">Total Users</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{allUsers.length}</p>
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center ml-2 flex-shrink-0">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-600">Approved Users</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {allUsers.filter(u => u.status === 'APPROVED').length}
                </p>
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-lg flex items-center justify-center ml-2 flex-shrink-0">
                <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-600">Rejected Users</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {allUsers.filter(u => u.status === 'REJECTED').length}
                </p>
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 rounded-lg flex items-center justify-center ml-2 flex-shrink-0">
                <UserX className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Verifications */}
      {pendingVerifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
              Pending Verification Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {pendingVerifications.map((request) => (
                <div key={request.id} className="border rounded-lg p-3 sm:p-4 bg-yellow-50">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                        <AvatarFallback className="text-xs sm:text-sm">
                          {getInitials(request.profiles.first_name, request.profiles.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                          {request.profiles.first_name} {request.profiles.last_name}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{request.profiles.email}</p>
                        {request.profiles.employee_id && (
                          <p className="text-xs sm:text-sm text-gray-600">ID: {request.profiles.employee_id}</p>
                        )}
                        {request.profiles.position && (
                          <p className="text-xs sm:text-sm text-gray-600 truncate">Position: {request.profiles.position}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Requested: {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col lg:flex-row gap-2 self-start">
                      <Button
                        size="sm"
                        onClick={() => handleVerificationAction(request.id, request.user_id, 'approve')}
                        className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm flex-1 sm:flex-none"
                      >
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        <span className="hidden xs:inline">Approve</span>
                        <span className="xs:hidden">✓</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleVerificationAction(request.id, request.user_id, 'reject')}
                        className="text-xs sm:text-sm flex-1 sm:flex-none"
                      >
                        <UserX className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        <span className="hidden xs:inline">Reject</span>
                        <span className="xs:hidden">✗</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Users Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {allUsers.map((user) => (
              <div key={user.id} className="border rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                      <AvatarFallback className="text-xs sm:text-sm">
                        {getInitials(user.first_name, user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        {user.first_name} {user.last_name}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{user.email}</p>
                      {user.position && (
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{user.position}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2">
                    <Badge className={`${getRoleColor(user.role)} text-xs`}>
                      {user.role === 'dept_head' ? 'Dept Head' : user.role}
                    </Badge>
                    <Badge className={`${getStatusColor(user.status)} text-xs`}>
                      {user.status === 'PENDING_VERIFICATION' ? 'Pending' : user.status}
                    </Badge>
                    {userRole === 'super_admin' && (
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="text-xs sm:text-sm border rounded px-2 py-1 min-w-0 w-auto"
                      >
                         <option value="employee">Employee</option>
                         <option value="dept_head">Dept Head</option>
                         <option value="admin">Admin</option>
                         <option value="super_admin">Super Admin</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;