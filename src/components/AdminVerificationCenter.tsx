import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Clock, User, Mail, Building } from 'lucide-react';

interface VerificationRequest {
  id: string;
  user_id: string;
  documents: any;
  status: string;
  admin_notes: string;
  rejected_reason: string;
  created_at: string;
  user_profile: {
    first_name: string;
    last_name: string;
    email: string;
    employee_id: string;
    phone: string;
    position: string;
  };
}

export const AdminVerificationCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchVerificationRequests();
  }, []);

  const fetchVerificationRequests = async () => {
    try {
      setLoading(true);
      
      // For now, fetch all pending profile updates that need verification
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'active') // We'll show all active users for now
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mock verification requests for demonstration
      const mockRequests = (profiles || []).slice(0, 3).map((profile, index) => ({
        id: `verification_${profile.id}`,
        user_id: profile.id,
        documents: { employee_id_photo: 'mock_document.jpg' },
        status: 'PENDING_VERIFICATION',
        admin_notes: '',
        rejected_reason: '',
        created_at: new Date().toISOString(),
        user_profile: {
          first_name: profile.first_name || 'Unknown',
          last_name: profile.last_name || 'User',
          email: profile.email || 'unknown@example.com',
          employee_id: profile.employee_id || `EMP${index + 1000}`,
          phone: profile.phone || '+1-234-567-8900',
          position: profile.position || 'Employee'
        }
      }));

      setRequests(mockRequests);
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      toast({
        title: "Error",
        description: "Failed to load verification requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      // Update user status to approved
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'active',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', request.user_id);

      if (error) throw error;

      toast({
        title: "User Approved",
        description: `${request.user_profile.first_name} ${request.user_profile.last_name} has been approved`,
      });

      fetchVerificationRequests();
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection",
        variant: "destructive"
      });
      return;
    }

    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      // Update user status to rejected
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'inactive' // Using existing status values
        })
        .eq('id', request.user_id);

      if (error) throw error;

      toast({
        title: "User Rejected",
        description: `${request.user_profile.first_name} ${request.user_profile.last_name} has been rejected`,
      });

      setRejectionReason('');
      setSelectedRequest(null);
      fetchVerificationRequests();
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast({
        title: "Error",
        description: "Failed to reject user",
        variant: "destructive"
      });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>User Verification Center</span>
            <Badge variant="secondary">{requests.length} pending</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">No pending verification requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback>
                            {getInitials(request.user_profile.first_name, request.user_profile.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="space-y-2">
                          <div>
                            <h3 className="font-semibold">
                              {request.user_profile.first_name} {request.user_profile.last_name}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Mail className="w-4 h-4" />
                                <span>{request.user_profile.email}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <User className="w-4 h-4" />
                                <span>{request.user_profile.employee_id}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Building className="w-4 h-4" />
                                <span>{request.user_profile.position}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>Pending Review</span>
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Submitted {new Date(request.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleApprove(request.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => setSelectedRequest(request.id)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                    
                    {selectedRequest === request.id && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Reason for Rejection
                          </label>
                          <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Please provide a detailed reason for rejection..."
                            className="resize-none"
                            rows={3}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(null);
                              setRejectionReason('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request.id)}
                          >
                            Confirm Rejection
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};