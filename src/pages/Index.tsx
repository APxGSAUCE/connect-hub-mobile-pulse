
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Calendar, MessageSquare, Users, Bell, 
  TrendingUp, Clock, CheckCircle, AlertCircle, Loader2, Menu
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SimpleMessageCenter from "@/components/SimpleMessageCenter";
import EventCalendar from "@/components/EventCalendar";
import ProfileMenu from "@/components/ProfileMenu";
import EmployeeManagement from "@/components/EmployeeManagement";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { notificationService } from "@/services/notificationService";

interface DashboardStats {
  total_messages: number;
  unread_messages: number;
  upcoming_events: number;
  total_employees: number;
  unread_notifications: number;
}

interface RecentActivity {
  id: string;
  type: 'message' | 'event' | 'notification';
  title: string;
  description: string;
  time: string;
  user?: {
    name: string;
    avatar?: string;
  };
}

interface RecentEvent {
  id: string;
  title: string;
  start_date: string;
  event_type: string;
  location?: string;
}

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<DashboardStats>({
    total_messages: 0,
    unread_messages: 0,
    upcoming_events: 0,
    total_employees: 0,
    unread_notifications: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Check URL parameters for tab selection and handle shortcuts
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['dashboard', 'messages', 'events', 'employees', 'profile'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Initialize notifications when component mounts
  useEffect(() => {
    notificationService.initialize();
    notificationService.requestPermission();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [messagesResult, employeesResult, eventsResult, notificationsResult, recentEventsResult] = await Promise.all([
        supabase
          .from('chat_group_members')
          .select('group_id')
          .eq('user_id', user.id)
          .then(async ({ data: groupData }) => {
            if (!groupData || groupData.length === 0) return { data: [] };
            const groupIds = groupData.map(g => g.group_id);
            return supabase
              .from('messages')
              .select('id, sender_id, created_at')
              .in('group_id', groupIds);
          }),
        
        supabase
          .from('profiles')
          .select('id')
          .eq('status', 'active'),
        
        supabase
          .from('events')
          .select('id')
          .gte('start_date', new Date().toISOString()),
        
        supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_read', false),

        supabase
          .from('events')
          .select('id, title, start_date, event_type, location')
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(3)
      ]);

      const totalMessages = (await messagesResult).data?.length || 0;
      const unreadMessages = (await messagesResult).data?.filter(
        msg => msg.sender_id !== user.id
      ).length || 0;

      setStats({
        total_messages: totalMessages,
        unread_messages: unreadMessages,
        upcoming_events: eventsResult.data?.length || 0,
        total_employees: employeesResult.data?.length || 0,
        unread_notifications: notificationsResult.data?.length || 0
      });

      setRecentEvents(recentEventsResult.data || []);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const activity: RecentActivity[] = (notifications || []).map(notification => ({
        id: notification.id,
        type: 'notification' as const,
        title: notification.title,
        description: notification.message,
        time: new Date(notification.created_at).toLocaleString()
      }));

      setRecentActivity(activity);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchDashboardData();
    }
  }, [user, authLoading, fetchDashboardData]);

  // Set up real-time subscriptions for dashboard updates
  useRealtimeSubscription('events', fetchDashboardData, [user]);
  useRealtimeSubscription('messages', fetchDashboardData, [user]);
  useRealtimeSubscription('notifications', fetchDashboardData, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      case 'notification': return <Bell className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'message': return 'text-blue-600 bg-blue-100';
      case 'event': return 'text-green-600 bg-green-100';
      case 'notification': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Handle shortcut navigation with improved functionality
  const handleShortcutClick = (shortcut: string) => {
    const tabMap: { [key: string]: string } = {
      'messages': 'messages',
      'events': 'events',
      'employees': 'employees',
      'profile': 'profile'
    };
    
    if (tabMap[shortcut]) {
      setActiveTab(tabMap[shortcut]);
      
      // Update URL to reflect the change
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabMap[shortcut]);
      window.history.pushState({}, '', url.toString());
      
      // Show toast for navigation feedback
      toast({
        title: "Navigation",
        description: `Switched to ${shortcut.charAt(0).toUpperCase() + shortcut.slice(1)} tab`,
      });
      
      // Scroll to top of content
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center safe-area-inset">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    window.location.href = '/auth';
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col ios-fix">
      {/* Header - Enhanced PWA safe area handling */}
      <div className="bg-white shadow-sm border-b flex-shrink-0 pwa-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12 sm:h-14">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h1 className="text-sm sm:text-lg font-bold text-gray-900 truncate">One Ilocos Sur Portal</h1>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-3 flex-shrink-0">
              <div className="relative">
                <Button variant="ghost" size="sm" className="relative p-1.5 sm:p-2">
                  <Bell className="w-4 h-4" />
                  {stats.unread_notifications > 0 && (
                    <Badge className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 p-0 flex items-center justify-center text-xs">
                      {stats.unread_notifications > 9 ? '9+' : stats.unread_notifications}
                    </Badge>
                  )}
                </Button>
              </div>
              
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Avatar className="w-6 h-6 sm:w-8 sm:h-8">
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                    {getInitials(user.email || 'User')}
                  </AvatarFallback>
                </Avatar>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut} 
                  className="hidden sm:inline-flex text-sm px-2"
                >
                  Sign Out
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut} 
                  className="sm:hidden p-1.5"
                >
                  <Menu className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Enhanced PWA responsiveness */}
      <div className="flex-1 flex flex-col overflow-hidden safe-area-left safe-area-right">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            {/* Mobile-optimized tab navigation with better spacing */}
            <TabsList className="grid w-full grid-cols-5 mb-3 sm:mb-6 h-auto bg-white rounded-lg shadow-sm mx-1">
              <TabsTrigger 
                value="dashboard" 
                className="flex flex-col items-center space-y-0.5 py-2 sm:py-3 text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden xs:inline">Dashboard</span>
                <span className="xs:hidden">Home</span>
              </TabsTrigger>
              <TabsTrigger 
                value="messages" 
                className="flex flex-col items-center space-y-0.5 py-2 sm:py-3 text-xs relative data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden xs:inline">Messages</span>
                <span className="xs:hidden">Chat</span>
                {stats.unread_messages > 0 && (
                  <Badge variant="secondary" className="absolute -top-0.5 -right-0.5 w-3 h-3 p-0 text-xs flex items-center justify-center">
                    {stats.unread_messages > 9 ? '9+' : stats.unread_messages}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="events" 
                className="flex flex-col items-center space-y-0.5 py-2 sm:py-3 text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
              >
                <Calendar className="w-4 h-4" />
                <span>Events</span>
              </TabsTrigger>
              <TabsTrigger 
                value="employees" 
                className="flex flex-col items-center space-y-0.5 py-2 sm:py-3 text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
              >
                <Users className="w-4 h-4" />
                <span className="hidden xs:inline">Team</span>
                <span className="xs:hidden">People</span>
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="flex flex-col items-center space-y-0.5 py-2 sm:py-3 text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
              >
                <Avatar className="w-4 h-4">
                  <AvatarFallback className="text-xs">
                    {getInitials(user.email || 'U')}
                  </AvatarFallback>
                </Avatar>
                <span>Profile</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="dashboard" className="space-y-3 sm:space-y-6 h-full overflow-y-auto">
                {/* Welcome Section - PWA optimized */}
                <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                    Welcome back! 👋
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Here's what's happening in your organization today.
                  </p>
                </div>

                {/* Stats Cards - Mobile optimized with better spacing */}
                <div className="grid grid-cols-2 gap-2 sm:gap-6">
                  <Card 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleShortcutClick('messages')}
                  >
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-600">Messages</p>
                          <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total_messages}</p>
                        </div>
                        <div className="w-6 h-6 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center ml-2 flex-shrink-0">
                          <MessageSquare className="w-3 h-3 sm:w-6 sm:h-6 text-blue-600" />
                        </div>
                      </div>
                      {stats.unread_messages > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          {stats.unread_messages} unread
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleShortcutClick('events')}
                  >
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-600">Events</p>
                          <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.upcoming_events}</p>
                        </div>
                        <div className="w-6 h-6 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center ml-2 flex-shrink-0">
                          <Calendar className="w-3 h-3 sm:w-6 sm:h-6 text-green-600" />
                        </div>
                      </div>
                      <p className="text-xs text-green-600 mt-1">Upcoming</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleShortcutClick('employees')}
                  >
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-600">Team</p>
                          <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total_employees}</p>
                        </div>
                        <div className="w-6 h-6 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center ml-2 flex-shrink-0">
                          <Users className="w-3 h-3 sm:w-6 sm:h-6 text-purple-600" />
                        </div>
                      </div>
                      <p className="text-xs text-purple-600 mt-1">Active users</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-600">Notifications</p>
                          <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.unread_notifications}</p>
                        </div>
                        <div className="w-6 h-6 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center ml-2 flex-shrink-0">
                          <Bell className="w-3 h-3 sm:w-6 sm:h-6 text-orange-600" />
                        </div>
                      </div>
                      <p className="text-xs text-orange-600 mt-1">Unread</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Events Section - PWA optimized */}
                {recentEvents.length > 0 && (
                  <Card>
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span className="font-semibold text-sm">Upcoming Events</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setActiveTab('events')}
                          className="text-xs px-2"
                        >
                          View All
                        </Button>
                      </div>
                      
                      <div className="space-y-2 sm:space-y-3">
                        {recentEvents.slice(0, 3).map((event) => (
                          <div key={event.id} className="flex items-center space-x-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {event.title}
                              </p>
                              <p className="text-xs text-gray-600">
                                {new Date(event.start_date).toLocaleDateString()} • {event.event_type}
                              </p>
                              {event.location && (
                                <p className="text-xs text-gray-500 truncate">
                                  📍 {event.location}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Activity - PWA optimized */}
                <Card className="safe-area-bottom">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold text-sm">Recent Activity</span>
                    </div>
                    
                    {loading ? (
                      <div className="flex items-center justify-center h-20">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      </div>
                    ) : recentActivity.length > 0 ? (
                      <div className="space-y-2 sm:space-y-3">
                        {recentActivity.map((activity) => (
                          <div key={activity.id} className="flex items-start space-x-3 p-2 sm:p-3 rounded-lg hover:bg-gray-50">
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {activity.title}
                              </p>
                              <p className="text-xs text-gray-600 truncate">
                                {activity.description}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {activity.time}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <AlertCircle className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No recent activity</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="messages" className="h-full">
                <SimpleMessageCenter />
              </TabsContent>

              <TabsContent value="events" className="h-full overflow-y-auto">
                <EventCalendar />
              </TabsContent>

              <TabsContent value="employees" className="h-full overflow-y-auto">
                <EmployeeManagement />
              </TabsContent>

              <TabsContent value="profile" className="h-full overflow-y-auto safe-area-bottom">
                <ProfileMenu />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Index;
