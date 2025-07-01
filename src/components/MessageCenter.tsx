
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, MessageSquare, Send, Search, Users, User, 
  Loader2, ArrowLeft, MoreVertical, UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ChatGroup {
  id: string;
  name: string;
  description: string;
  group_type: 'direct' | 'group' | 'department';
  created_by: string;
  created_at: string;
  members?: GroupMember[];
  last_message?: Message;
  unread_count?: number;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  profile: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  group_id: string;
  message_type: 'text' | 'file' | 'image';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}

const MessageCenter = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'groups' | 'chat' | 'new-group'>('groups');
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // New group creation state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupType, setNewGroupType] = useState<'group' | 'department'>('group');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchChatGroups();
      fetchEmployees();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Only add message if it's for the current active group
          if (activeGroup && newMessage.group_id === activeGroup.id) {
            setMessages(prev => [...prev, newMessage]);
          }
          // Refresh groups to update last message and unread counts
          fetchChatGroups();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchChatGroups = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_group_members')
        .select(`
          group_id,
          chat_groups!inner (
            id,
            name,
            description,
            group_type,
            created_by,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const groups = data?.map(item => ({
        ...item.chat_groups,
        group_type: item.chat_groups.group_type as 'direct' | 'group' | 'department'
      })).filter(Boolean) || [];
      
      setChatGroups(groups);
    } catch (error) {
      console.error('Error fetching chat groups:', error);
      toast({
        title: "Error",
        description: "Failed to load chat groups.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, status')
        .eq('status', 'active')
        .neq('id', user?.id);

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchMessages = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!inner (
            first_name,
            last_name,
            email
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const typedMessages = (data || []).map(msg => ({
        ...msg,
        message_type: msg.message_type as 'text' | 'file' | 'image'
      }));
      
      setMessages(typedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages.",
        variant: "destructive"
      });
    }
  };

  const openChat = async (group: ChatGroup) => {
    setActiveGroup(group);
    setActiveView('chat');
    await fetchMessages(group.id);
  };

  const sendMessage = async () => {
    if (!messageContent.trim() || !activeGroup || !user) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: activeGroup.id,
          sender_id: user.id,
          content: messageContent.trim(),
          message_type: 'text'
        });

      if (error) throw error;

      setMessageContent('');
      // Message will be added via realtime subscription
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const createDirectMessage = async (employeeId: string) => {
    try {
      const { data, error } = await supabase.rpc('create_direct_message_group', {
        other_user_id: employeeId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Direct message conversation created.",
      });

      // Refresh groups and open the new chat
      await fetchChatGroups();
      
      // Find and open the newly created group
      const { data: newGroup, error: groupError } = await supabase
        .from('chat_groups')
        .select('*')
        .eq('id', data)
        .single();

      if (!groupError && newGroup) {
        const typedGroup: ChatGroup = {
          ...newGroup,
          group_type: newGroup.group_type as 'direct' | 'group' | 'department'
        };
        openChat(typedGroup);
      }
    } catch (error) {
      console.error('Error creating direct message:', error);
      toast({
        title: "Error",
        description: "Failed to create direct message.",
        variant: "destructive"
      });
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || selectedMembers.length === 0 || !user) return;

    setLoading(true);
    try {
      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('chat_groups')
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim(),
          group_type: newGroupType,
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin
      const { error: creatorError } = await supabase
        .from('chat_group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin'
        });

      if (creatorError) throw creatorError;

      // Add selected members
      const memberInserts = selectedMembers.map(memberId => ({
        group_id: group.id,
        user_id: memberId,
        role: 'member'
      }));

      const { error: membersError } = await supabase
        .from('chat_group_members')
        .insert(memberInserts);

      if (membersError) throw membersError;

      toast({
        title: "Success",
        description: "Group created successfully!",
      });

      // Reset form and refresh
      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedMembers([]);
      setActiveView('groups');
      await fetchChatGroups();

    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create group.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const filteredEmployees = employees.filter(emp =>
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && activeView === 'groups') {
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
      {activeView === 'groups' && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
              <p className="text-gray-600">Connect with your team</p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={() => setActiveView('new-group')}>
                <Plus className="w-4 h-4 mr-2" />
                New Group
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Start a Conversation</CardTitle>
              <CardDescription>Send a direct message to any team member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {searchTerm && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredEmployees.map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                              {getInitials(employee.first_name, employee.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{employee.first_name} {employee.last_name}</p>
                            <p className="text-xs text-gray-500">{employee.email}</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => createDirectMessage(employee.id)}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Message
                        </Button>
                      </div>
                    ))}
                    {filteredEmployees.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No employees found</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Groups */}
          <Card>
            <CardHeader>
              <CardTitle>Your Conversations</CardTitle>
              <CardDescription>Recent group chats and direct messages</CardDescription>
            </CardHeader>
            <CardContent>
              {chatGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                  <p className="text-gray-600 mb-4">Start chatting with your team members</p>
                  <Button onClick={() => setActiveView('new-group')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {chatGroups.map((group) => (
                    <div 
                      key={group.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => openChat(group)}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {group.group_type === 'direct' ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{group.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {group.group_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{group.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(group.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeView === 'new-group' && (
        <>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => setActiveView('groups')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Group</h2>
              <p className="text-gray-600">Set up a new group conversation</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Group Details</CardTitle>
              <CardDescription>Configure your new group settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">Group Name *</Label>
                <Input
                  id="groupName"
                  placeholder="Enter group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="groupDescription">Description</Label>
                <Textarea
                  id="groupDescription"
                  placeholder="Optional group description"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="groupType">Group Type</Label>
                <Select value={newGroupType} onValueChange={(value: 'group' | 'department') => setNewGroupType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">General Group</SelectItem>
                    <SelectItem value="department">Department Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Add Members *</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`member-${employee.id}`}
                        checked={selectedMembers.includes(employee.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, employee.id]);
                          } else {
                            setSelectedMembers(selectedMembers.filter(id => id !== employee.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`member-${employee.id}`} className="flex items-center space-x-2 flex-1 cursor-pointer">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                            {getInitials(employee.first_name, employee.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{employee.first_name} {employee.last_name}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Selected: {selectedMembers.length} members
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setActiveView('groups')}>
                  Cancel
                </Button>
                <Button 
                  onClick={createGroup} 
                  disabled={!newGroupName.trim() || selectedMembers.length === 0 || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Group
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeView === 'chat' && activeGroup && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => setActiveView('groups')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {activeGroup.group_type === 'direct' ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{activeGroup.name}</h2>
                  <p className="text-sm text-gray-600">{activeGroup.description}</p>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>

          <Card className="h-96 flex flex-col">
            <CardContent className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_id === user?.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.sender_id !== user?.id && (
                        <p className="text-xs font-medium mb-1">
                          {message.sender?.first_name} {message.sender?.last_name}
                        </p>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_id === user?.id ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>
            </CardContent>
            
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Type your message..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={sendingMessage || !messageContent.trim()}>
                  {sendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default MessageCenter;
