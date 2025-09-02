import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { CheckCircle, XCircle, Clock, User, Mail, Building, Loader2 } from 'lucide-react';

interface PendingApproval {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_id: string;
  phone: string;
  position: string;
  department_id: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approval_notes: string;
  rejected_reason: string;
  department_name: string;
}

export const ApprovalCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_pending_approvals');

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      toast({
        title: "Error",
        description: "Failed to load pending approvals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPendingApprovals();
    }
  }, [user]);

  // Set up real-time subscription for profile changes
  useRealtimeSubscription('profiles', fetchPendingApprovals, [user]);

  const handleApprove = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          approval_notes: approvalNotes.trim() || null
        })
        .eq('id', requestId);

      if (error) throw error;

      const request = requests.find(r => r.id === requestId);
      toast({
        title: "User Approved",
        description: `${request?.first_name} ${request?.last_name} has been approved`,
      });

      setApprovalNotes('');
      fetchPendingApprovals();
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
      const { error } = await supabase
        .from('profiles')
        .update({ 
          approval_status: 'rejected',
          rejected_reason: rejectionReason.trim()
        })
        .eq('id', requestId);

      if (error) throw error;

      const request = requests.find(r => r.id === requestId);
      toast({
        title: "User Rejected",
        description: `${request?.first_name} ${request?.last_name} has been rejected`,
      });

      setRejectionReason('');
      setSelectedRequest(null);
      fetchPendingApprovals();
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
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
            <span>User Approval Center</span>
            <Badge variant="secondary">{requests.length} pending</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">No pending approval requests</p>
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
                            {getInitials(request.first_name, request.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="space-y-2">
                          <div>
                            <h3 className="font-semibold">
                              {request.first_name} {request.last_name}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Mail className="w-4 h-4" />
                                <span>{request.email}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <User className="w-4 h-4" />
                                <span>{request.employee_id}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Building className="w-4 h-4" />
                                <span>{request.position}</span>
                              </div>
                            </div>
                            {request.department_name && (
                              <div className="text-sm text-gray-600">
                                Department: {request.department_name}
                              </div>
                            )}
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

                    <div className="mt-4 pt-4 border-t">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Approval Notes (Optional)
                        </label>
                        <Textarea
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          placeholder="Add notes for this approval..."
                          className="resize-none"
                          rows={2}
                        />
                      </div>
                    </div>
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