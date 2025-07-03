import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { 
  Plus, MessageSquare, Send, Search, Users, User, 
  Loader2, ArrowLeft, Paperclip, File, Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface ChatGroup {
  id: string;
  name: string;
  description: string;
  group_type: 'direct' | 'group' | 'department';
  created_by: string;
  created_at: string;
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

const SimpleMessageCenter = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<'groups' | 'chat' | 'new-group'>('groups');
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    if (user) {
      fetchChatGroups();
      fetchEmployees();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up real-time subscriptions
  useRealtimeSubscription('messages', () => {
    fetchChatGroups();
    if (activeGroup) {
      fetchMessages(activeGroup.id);
    }
  }, [user, activeGroup]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
          sender:profiles!messages_sender_id_fkey (
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
        message_type: msg.message_type as 'text' | 'file' | 'image',
        sender: msg.sender && typeof msg.sender === 'object' && !Array.isArray(msg.sender) && 'first_name' in msg.sender 
          ? msg.sender as { first_name: string; last_name: string; email: string }
          : undefined
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeGroup || !user) return;

    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `messages/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);

      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: activeGroup.id,
          sender_id: user.id,
          content: `Shared a file: ${file.name}`,
          message_type: file.type.startsWith('image/') ? 'image' : 'file',
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "File uploaded successfully!",
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file.",
        variant: "destructive"
      });
    } finally {
      setUploadingFile(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const createDirectMessage = async (employeeId: string, employeeName: string) => {
    try {
      const { data, error } = await supabase.rpc('create_direct_message_group', {
        other_user_id: employeeId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Direct message with ${employeeName} created.`,
      });

      await fetchChatGroups();
      
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
      const { data: group, error: groupError } = await supabase
        .from('chat_groups')
        .insert({
          name: newGroupName.trim(),
          description: `Group chat with ${selectedMembers.length} members`,
          group_type: 'group',
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      const { error: creatorError } = await supabase
        .from('chat_group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin'
        });

      if (creatorError) throw creatorError;

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

      setNewGroupName('');
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

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file.",
        variant: "destructive"
      });
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredEmployees = employees.filter(emp =>
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && activeView === 'groups') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {activeView === 'groups' && (
        <div className="space-y-4 flex-1 overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Messages</h2>
              <p className="text-sm text-gray-600">Connect with your team</p>
            </div>
            <Button onClick={() => setActiveView('new-group')} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Group
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Start a Direct Message</CardTitle>
              <CardDescription className="text-sm">Send a message to any team member</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                            {getInitials(employee.first_name, employee.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{employee.first_name} {employee.last_name}</p>
                          <p className="text-xs text-gray-500 truncate">{employee.email}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => createDirectMessage(employee.id, `${employee.first_name} ${employee.last_name}`)}
                        className="ml-2 flex-shrink-0"
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Chat</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Your Conversations</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {chatGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chatGroups.map((group) => (
                    <div 
                      key={group.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => openChat(group)}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {group.group_type === 'direct' ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900 truncate">{group.name}</h4>
                          <p className="text-sm text-gray-600 truncate">{group.description || 'No description'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeView === 'new-group' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => setActiveView('groups')} size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create New Group</h2>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Group Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  placeholder="Enter group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>

              <div>
                <Label>Select Members</Label>
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
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <Button variant="outline" onClick={() => setActiveView('groups')} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button 
                  onClick={createGroup} 
                  disabled={!newGroupName.trim() || selectedMembers.length === 0}
                  className="w-full sm:w-auto"
                >
                  Create Group
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeView === 'chat' && activeGroup && (
        <div className="flex flex-col h-full">
          <div className="flex items-center space-x-4 mb-4">
            <Button variant="ghost" onClick={() => setActiveView('groups')} size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {activeGroup.group_type === 'direct' ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-gray-900 truncate">{activeGroup.name}</h2>
                <p className="text-sm text-gray-600 truncate">{activeGroup.description}</p>
              </div>
            </div>
          </div>

          <Card className="flex-1 flex flex-col min-h-0">
            <CardContent className="flex-1 p-4 overflow-y-auto min-h-0">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] sm:max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_id === user?.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.sender_id !== user?.id && message.sender && (
                        <p className="text-xs font-medium mb-1 opacity-75">
                          {message.sender.first_name} {message.sender.last_name}
                        </p>
                      )}
                      
                      {message.message_type === 'text' && (
                        <p className="text-sm break-words">{message.content}</p>
                      )}
                      
                      {(message.message_type === 'file' || message.message_type === 'image') && (
                        <div className="space-y-2">
                          <p className="text-sm break-words">{message.content}</p>
                          {message.message_type === 'image' && message.file_url && (
                            <img 
                              src={message.file_url} 
                              alt={message.file_name || 'Image'}
                              className="max-w-full h-auto rounded"
                            />
                          )}
                          {message.file_name && (
                            <div className="flex items-center space-x-2 text-xs">
                              <File className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{message.file_name}</span>
                              {message.file_size && (
                                <span className="flex-shrink-0">({formatFileSize(message.file_size)})</span>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => message.file_url && downloadFile(message.file_url, message.file_name || 'file')}
                                className="h-auto p-1 flex-shrink-0"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <p className={`text-xs mt-1 ${
                        message.sender_id === user?.id ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
            
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="flex-shrink-0"
                >
                  {uploadingFile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                </Button>
                <Input
                  placeholder="Type your message..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={sendingMessage || !messageContent.trim()}
                  className="flex-shrink-0"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SimpleMessageCenter;
