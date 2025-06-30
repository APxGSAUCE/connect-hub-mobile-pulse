
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Plus, MessageSquare, Send, Search, Filter, CheckCheck, Paperclip, File, Download, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  subject: string;
  content: string;
  sender: string;
  recipient: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  thread?: string;
  attachments?: FileAttachment[];
}

interface FileAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
}

const MessageCenter = () => {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      subject: 'Project Update Required',
      content: 'Hi team, please provide an update on your current project status by end of day. We need to ensure all deliverables are on track.',
      sender: 'Sarah Johnson',
      recipient: 'John Doe',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      isRead: false,
      priority: 'high',
      thread: 'thread-1',
      attachments: [
        { id: '1', name: 'project_requirements.pdf', size: '2.5 MB', type: 'application/pdf' }
      ]
    },
    {
      id: '2',
      subject: 'Meeting Rescheduled',
      content: 'The client meeting has been moved to tomorrow at 2 PM. Please update your calendars accordingly and prepare the presentation materials.',
      sender: 'Mike Wilson',
      recipient: 'John Doe',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      isRead: true,
      priority: 'medium',
      thread: 'thread-2'
    },
    {
      id: '3',
      subject: 'Welcome to the Team!',
      content: 'We are excited to have you join our team. Here is some important information to get you started with your onboarding process.',
      sender: 'HR Department',
      recipient: 'John Doe',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      isRead: true,
      priority: 'low',
      thread: 'thread-3',
      attachments: [
        { id: '2', name: 'employee_handbook.pdf', size: '1.8 MB', type: 'application/pdf' },
        { id: '3', name: 'benefits_overview.docx', size: '892 KB', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      ]
    }
  ]);

  const [newMessage, setNewMessage] = useState({
    recipient: '',
    subject: '',
    content: '',
    priority: 'medium' as const,
    attachments: [] as File[]
  });

  const validateMessage = () => {
    if (!newMessage.recipient.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a recipient.",
        variant: "destructive"
      });
      return false;
    }

    if (!newMessage.subject.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a subject.",
        variant: "destructive"
      });
      return false;
    }

    if (!newMessage.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a message.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    
    try {
      // Validate file sizes and types
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];

      const validFiles: File[] = [];
      
      for (const file of Array.from(files)) {
        if (file.size > maxFileSize) {
          toast({
            title: "File Too Large",
            description: `${file.name} is larger than 10MB. Please choose a smaller file.`,
            variant: "destructive"
          });
          continue;
        }

        if (!allowedTypes.includes(file.type)) {
          toast({
            title: "File Type Not Allowed",
            description: `${file.name} has an unsupported file type.`,
            variant: "destructive"
          });
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        setNewMessage({
          ...newMessage,
          attachments: [...newMessage.attachments, ...validFiles]
        });

        toast({
          title: "Files Added",
          description: `${validFiles.length} file(s) added successfully.`,
        });
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload Error",
        description: "Failed to add files. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingFiles(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    const updatedAttachments = newMessage.attachments.filter((_, i) => i !== index);
    setNewMessage({ ...newMessage, attachments: updatedAttachments });
    
    toast({
      title: "File Removed",
      description: "Attachment has been removed.",
    });
  };

  const handleSendMessage = async () => {
    if (!validateMessage()) return;

    setSendingMessage(true);

    try {
      // Simulate sending delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const attachments = newMessage.attachments.map((file, index) => ({
        id: `att-${Date.now()}-${index}`,
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type
      }));

      const message: Message = {
        id: Date.now().toString(),
        subject: newMessage.subject.trim(),
        content: newMessage.content.trim(),
        recipient: newMessage.recipient.trim(),
        priority: newMessage.priority,
        sender: 'John Doe', // Current user
        timestamp: new Date().toISOString(),
        isRead: true,
        thread: `thread-${Date.now()}`,
        attachments: attachments.length > 0 ? attachments : undefined
      };

      setMessages([message, ...messages]);
      setNewMessage({
        recipient: '',
        subject: '',
        content: '',
        priority: 'medium',
        attachments: []
      });
      setActiveView('sent');

      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully!",
      });
    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: "Send Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDownloadAttachment = (attachment: FileAttachment) => {
    // Simulate download
    toast({
      title: "Download Started",
      description: `Downloading ${attachment.name}...`,
    });
    
    // In a real app, this would trigger the actual download
    setTimeout(() => {
      toast({
        title: "Download Complete",
        description: `${attachment.name} has been downloaded.`,
      });
    }, 2000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const markAsRead = (messageId: string) => {
    setMessages(messages.map(msg => 
      msg.id === messageId ? { ...msg, isRead: true } : msg
    ));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 3600);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const inboxMessages = messages.filter(msg => msg.recipient === 'John Doe');
  const sentMessages = messages.filter(msg => msg.sender === 'John Doe');
  const unreadCount = inboxMessages.filter(msg => !msg.isRead).length;

  const filteredMessages = (activeView === 'inbox' ? inboxMessages : sentMessages)
    .filter(msg => 
      msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.recipient.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Message Center</h2>
          <p className="text-gray-600">Team communication with file sharing</p>
        </div>

        <Button onClick={() => setActiveView('compose')} disabled={sendingMessage}>
          <Plus className="w-4 h-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* Message Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{inboxMessages.length}</p>
                <p className="text-sm text-gray-600">Total Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">
                {unreadCount}
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-sm text-gray-600">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Send className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{sentMessages.length}</p>
                <p className="text-sm text-gray-600">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Paperclip className="w-6 h-6 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {messages.reduce((acc, msg) => acc + (msg.attachments?.length || 0), 0)}
                </p>
                <p className="text-sm text-gray-600">Files Shared</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'inbox', label: 'Inbox', count: unreadCount },
          { key: 'sent', label: 'Sent', count: sentMessages.length },
          { key: 'compose', label: 'Compose', count: null }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key as any)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeView === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={sendingMessage}
          >
            <span>{tab.label}</span>
            {tab.count !== null && tab.count > 0 && (
              <Badge variant="secondary" className="text-xs">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {activeView === 'compose' ? (
        <Card>
          <CardHeader>
            <CardTitle>Compose New Message</CardTitle>
            <CardDescription>Send a message with file attachments to your team members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="recipient">To *</Label>
              <Input
                id="recipient"
                placeholder="Enter recipient name"
                value={newMessage.recipient}
                onChange={(e) => setNewMessage({ ...newMessage, recipient: e.target.value })}
                disabled={sendingMessage}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Enter message subject"
                value={newMessage.subject}
                onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                disabled={sendingMessage}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="content">Message *</Label>
              <Textarea
                id="content"
                placeholder="Type your message here..."
                rows={6}
                value={newMessage.content}
                onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                disabled={sendingMessage}
              />
            </div>
            
            {/* File Upload Section */}
            <div className="grid gap-2">
              <Label htmlFor="attachments">Attachments</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="flex-1"
                  disabled={sendingMessage || uploadingFiles}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  disabled={sendingMessage || uploadingFiles}
                >
                  {uploadingFiles ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Paperclip className="w-4 h-4 mr-2" />
                  )}
                  Add Files
                </Button>
              </div>
              
              {/* Show attached files */}
              {newMessage.attachments.length > 0 && (
                <div className="space-y-2 mt-2">
                  <p className="text-sm font-medium text-gray-700">Attached Files:</p>
                  {newMessage.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                      <div className="flex items-center space-x-2">
                        <File className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
                        <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="h-6 w-6 p-0 hover:bg-red-100"
                        disabled={sendingMessage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="priority">Priority:</Label>
                <select
                  id="priority"
                  value={newMessage.priority}
                  onChange={(e) => setNewMessage({ ...newMessage, priority: e.target.value as any })}
                  className="px-3 py-1 border rounded-md bg-white disabled:bg-gray-100"
                  disabled={sendingMessage}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <Button onClick={handleSendMessage} disabled={sendingMessage}>
                {sendingMessage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Message List */}
          <div className="space-y-3">
            {filteredMessages.map((message) => (
              <Card
                key={message.id}
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  !message.isRead && activeView === 'inbox' ? 'border-blue-200 bg-blue-50/50' : ''
                }`}
                onClick={() => {
                  if (activeView === 'inbox' && !message.isRead) {
                    markAsRead(message.id);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getInitials(activeView === 'inbox' ? message.sender : message.recipient)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <p className={`text-sm font-medium truncate ${!message.isRead && activeView === 'inbox' ? 'font-semibold' : ''}`}>
                            {activeView === 'inbox' ? message.sender : message.recipient}
                          </p>
                          {!message.isRead && activeView === 'inbox' && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                          )}
                          {message.attachments && message.attachments.length > 0 && (
                            <Paperclip className="w-3 h-3 text-gray-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <Badge className={`${getPriorityColor(message.priority)} text-xs`} variant="secondary">
                            {message.priority}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatTime(message.timestamp)}
                          </span>
                          {activeView === 'sent' && (
                            <CheckCheck className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </div>
                      
                      <p className={`text-sm text-gray-900 mb-1 ${!message.isRead && activeView === 'inbox' ? 'font-medium' : ''}`}>
                        {message.subject}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {message.content}
                      </p>
                      
                      {/* Show attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center space-x-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                              <File className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{attachment.name}</span>
                              <span className="flex-shrink-0">({attachment.size})</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs ml-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadAttachment(attachment);
                                }}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredMessages.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'No messages found' : `No ${activeView} messages`}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm 
                      ? 'Try adjusting your search terms'
                      : activeView === 'inbox' 
                        ? "You're all caught up!" 
                        : 'Send your first message to get started'
                    }
                  </p>
                  {!searchTerm && activeView === 'inbox' && (
                    <Button onClick={() => setActiveView('compose')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageCenter;
