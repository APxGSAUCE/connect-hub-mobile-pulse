import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/hooks/useUserRole';
import { Shield, Lock, Check, X } from 'lucide-react';

interface PermissionBannerProps {
  userRole: UserRole;
  feature: 'messages' | 'events';
}

export const PermissionBanner: React.FC<PermissionBannerProps> = ({ userRole, feature }) => {
  const canCreate = feature === 'messages' ? userRole.can_create_messages : userRole.can_create_events;
  const featureName = feature === 'messages' ? 'group chats' : 'events';
  const actionName = feature === 'messages' ? 'create new chats' : 'create events';

  if (canCreate) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-green-900">Full Access</h4>
              <p className="text-sm text-green-700">
                You can {actionName} and participate in all {featureName}.
              </p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {userRole.role === 'super_admin' ? 'Super Admin' : 
               userRole.role === 'admin' ? 'Admin' : 'Department Head'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <Lock className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-orange-900">Limited Access</h4>
            <p className="text-sm text-orange-700">
              You cannot {actionName}, but you can participate in existing {featureName} you're invited to.
            </p>
          </div>
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            Employee
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export const PermissionMatrix: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const permissions = [
    { 
      name: 'Create Group Chats', 
      allowed: userRole.can_create_messages,
      description: 'Start new group conversations'
    },
    { 
      name: 'Create Events', 
      allowed: userRole.can_create_events,
      description: 'Schedule and organize events'
    },
    { 
      name: 'Reply to Messages', 
      allowed: true,
      description: 'Participate in existing conversations'
    },
    { 
      name: 'RSVP to Events', 
      allowed: true,
      description: 'Respond to event invitations'
    },
    { 
      name: 'Manage Users', 
      allowed: userRole.can_manage_users,
      description: 'Add/remove users and change roles'
    }
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Your Permissions</h3>
          <Badge variant="outline" className="ml-auto">
            {userRole.role === 'super_admin' ? 'Super Admin' : 
             userRole.role === 'admin' ? 'Admin' : 
             userRole.is_department_head ? 'Department Head' : 'Employee'}
          </Badge>
        </div>
        <div className="space-y-3">
          {permissions.map((permission) => (
            <div key={permission.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  {permission.allowed ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-medium text-sm">{permission.name}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1 ml-6">{permission.description}</p>
              </div>
              <Badge variant={permission.allowed ? "default" : "destructive"} className="text-xs">
                {permission.allowed ? 'Allowed' : 'Restricted'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};