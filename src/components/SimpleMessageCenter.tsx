import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MessageSquare, Plus, Send, Users, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { notificationService } from "@/services/notificationService";

interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  group_type: string;
  created_at: string;
  member_count?: number;
  last_message?: {
    content: string;
    created_at: string;
    sender_name: string;
  };
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  group_id: string;
  sender?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  department_id: string | null;
  position: string | null;
}

const SimpleMessageCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Initialize notifications
  useEffect(() => {
    notificationService.initialize();
  }, []);

  const fetchGroups = async () => {
    if (!user) return;

    try {
      console.log('Fetching chat groups...');
      const { data: groupData, error: groupError } = await supabase
        .from('chat_group_members')
        .select(`
          group_id,
          chat_groups (
            id,
            name,
            description,
            group_type,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (groupError) {
        console.error('Error fetching groups:', groupError);
        throw groupError;
      }

      console.log('Raw group data:', groupData);

      const groupsWithDetails = await Promise.all(
        (groupData || []).map(async (item: any) => {
          const group = item.chat_groups;
          if (!group) return null;

          // Get member count
          const { count: memberCount } = await supabase
            .from('chat_group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          // Get last message with sender info
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select(`
              content,
              created_at,
              sender_id,
              profiles!messages_sender_id_fkey(first_name, last_name, email)
            `)
            .eq('group_id', group.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...group,
            member_count: memberCount || 0,
            last_message: lastMessageData ? {
              content: lastMessageData.content,
              created_at: lastMessageData.created_at,
              sender_name: lastMessageData.profiles
                ? `${lastMessageData.profiles.first_name || ''} ${lastMessageData.profiles.last_name || ''}`.trim() || lastMessageData.profiles.email || 'Unknown'
                : 'Unknown'
            } : undefined
          };
        })
      );

      const validGroups = groupsWithDetails.filter(Boolean) as ChatGroup[];
      console.log('Processed groups:', validGroups);
      setGroups(validGroups);

    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: "Error",
        description: "Failed to load chat groups.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (groupId: string) => {
    if (!user) return;

    try {
      setMessagesLoading(true);
      console.log('Fetching messages for group:', groupId);

      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          group_id,
          profiles!messages_sender_id_fkey(first_name, last_name, email)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }

      const formattedMessages = (messagesData || []).map(msg => ({
        ...msg,
        sender: msg.profiles
      }));
      setMessages(formattedMessages);

    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages.",
        variant: "destructive"
      });
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, department_id, position')
        .eq('status', 'active')
        .neq('id', user.id);

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchEmployees();
    }
  }, [user]);

  // Set up real-time subscriptions
  useRealtimeSubscription('messages', () => {
    if (selectedGroup) {
      fetchMessages(selectedGroup.id);
    }
    fetchGroups();
  }, [selectedGroup]);

  const handleSendMessage = async () => {
    if (!user || !selectedGroup || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          group_id: selectedGroup.id,
          sender_id: user.id,
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage("");
      fetchMessages(selectedGroup.id);
      fetchGroups(); // Refresh to update last message

      // Show notification to other users
      await notificationService.showMessageNotification(
        user.email || 'Someone',
        newMessage.trim()
      );

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive"
      });
    }
  };

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) return;

    try {
      const { data: groupData, error: groupError } = await supabase
        .from('chat_groups')
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          group_type: 'group',
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator to the group
      const { error: memberError } = await supabase
        .from('chat_group_members')
        .insert({
          group_id: groupData.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      toast({
        title: "Success",
        description: "Group created successfully!",
      });

      setNewGroupName("");
      setNewGroupDescription("");
      setIsDialogOpen(false);
      fetchGroups();

    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create group.",
        variant: "destructive"
      });
    }
  };

  const handleCreateDirectMessage = async () => {
    if (!user || !selectedEmployee) return;

    try {
      const { data, error } = await supabase.rpc('create_direct_message_group', {
        other_user_id: selectedEmployee
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Direct message created!",
      });

      setSelectedEmployee("");
      setIsDialogOpen(false);
      fetchGroups();

    } catch (error) {
      console.error('Error creating direct message:', error);
      toast({
        title: "Error",
        description: "Failed to create direct message.",
        variant: "destructive"
      });
    }
  };

  const handleGroupSelect = (group: ChatGroup) => {
    setSelectedGroup(group);
    fetchMessages(group.id);
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getSenderName = (message: Message) => {
    if (message.sender) {
      const fullName = `${message.sender.first_name || ''} ${message.sender.last_name || ''}`.trim();
      return fullName || message.sender.email || 'Unknown';
    }
    return 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Messages</h2>
          <p className="text-sm text-gray-600">Connect with your team</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Chat</DialogTitle>
              <DialogDescription>
                Start a new group conversation or direct message
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Chat Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewGroupName("");
                      setNewGroupDescription("");
                    }}
                    className="h-20 flex flex-col"
                  >
                    <Users className="w-6 h-6 mb-2" />
                    Group Chat
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedEmployee("");
                    }}
                    className="h-20 flex flex-col"
                  >
                    <MessageSquare className="w-6 h-6 mb-2" />
                    Direct Message
                  </Button>
                </div>
              </div>

              {/* Group Chat Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Group Name</Label>
                  <Input
                    id="groupName"
                    placeholder="Enter group name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="groupDescription">Description (Optional)</Label>
                  <Input
                    id="groupDescription"
                    placeholder="Enter group description"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleCreateGroup} 
                  disabled={!newGroupName.trim()}
                  className="w-full"
                >
                  Create Group
                </Button>
              </div>

              {/* Direct Message Form */}
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>Select Employee</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                  >
                    <option value="">Choose an employee...</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {`${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email}
                        {employee.position && ` - ${employee.position}`}
                      </option>
                    ))}
                  </select>
                </div>

                <Button 
                  onClick={handleCreateDirectMessage} 
                  disabled={!selectedEmployee}
                  className="w-full"
                >
                  Start Direct Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        {/* Chat Groups List */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Chats</CardTitle>
                <Badge variant="secondary">{groups.length}</Badge>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search chats..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full">
                {filteredGroups.length > 0 ? (
                  <div className="space-y-2 p-4">
                    {filteredGroups.map((group) => (
                      <div
                        key={group.id}
                        onClick={() => handleGroupSelect(group)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedGroup?.id === group.id
                            ? 'bg-blue-50 border-blue-200 border'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                              {group.group_type === 'direct' ? (
                                <MessageSquare className="w-5 h-5" />
                              ) : (
                                getInitials(group.name)
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm truncate">{group.name}</h4>
                              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                {group.member_count} members
                              </span>
                            </div>
                            {group.last_message && (
                              <div className="mt-1">
                                <p className="text-xs text-gray-600 truncate">
                                  <span className="font-medium">{group.last_message.sender_name}:</span>{' '}
                                  {group.last_message.content}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(group.last_message.created_at).toLocaleString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">No chats found</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {searchTerm ? 'Try adjusting your search' : 'Start a conversation with your team'}
                    </p>
                    <Button onClick={() => setIsDialogOpen(true)} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      New Chat
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Messages Area */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            {selectedGroup ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {selectedGroup.group_type === 'direct' ? (
                          <MessageSquare className="w-5 h-5" />
                        ) : (
                          getInitials(selectedGroup.name)
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedGroup.name}</CardTitle>
                      {selectedGroup.description && (
                        <CardDescription>{selectedGroup.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 p-4">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      </div>
                    ) : messages.length > 0 ? (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.sender_id === user?.id
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              {message.sender_id !== user?.id && (
                                <p className="text-xs font-medium mb-1 opacity-75">
                                  {getSenderName(message)}
                                </p>
                              )}
                              <p className="text-sm">{message.content}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  message.sender_id === user?.id
                                    ? 'text-blue-100'
                                    : 'text-gray-500'
                                }`}
                              >
                                {new Date(message.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-center">
                        <div>
                          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="font-medium text-gray-900 mb-2">No messages yet</h3>
                          <p className="text-sm text-gray-600">Start the conversation!</p>
                        </div>
                      </div>
                    )}
                  </ScrollArea>

                  <div className="border-t p-4">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a chat</h3>
                  <p className="text-gray-600">Choose a conversation to start messaging</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SimpleMessageCenter;
