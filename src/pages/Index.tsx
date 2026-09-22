
import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Calendar, MessageSquare, Users, Bell, 
  TrendingUp, Clock, AlertCircle, Loader2, ShieldCheck
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SimpleMessageCenter from "@/components/SimpleMessageCenter";
import EventCalendar from "@/components/EventCalendar";
import ProfileMenu from "@/components/ProfileMenu";
import EmployeeManagement from "@/components/EmployeeManagement";
import { AppHeader } from "@/components/AppHeader";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { notificationService } from "@/services/notificationService";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import AdminDashboard from "@/components/AdminDashboard";


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
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const VALID_TABS = ["dashboard", "messages", "events", "employees", "admin", "profile"];
  // A section can be addressed directly (/messages) or via ?tab=messages (legacy links).
  const pathSection = location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  const requestedTab = VALID_TABS.includes(pathSection)
    ? pathSection
    : (searchParams.get("tab") || "dashboard").toLowerCase();
  const activeTab = VALID_TABS.includes(requestedTab) ? requestedTab : "dashboard";
  const setActiveTab = (tab: string) => {
    const target = tab === "dashboard" ? "/" : `/${tab}`;
    if (target !== location.pathname) {
      navigate(target);
    }
  };
  const [userRole, setUserRole] = useState<string>('');
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

  // Initialize notification service once on mount
  useEffect(() => {
    notificationService.initialize();
  }, []);


  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Use the updated dashboard stats function
      const { data: dashboardStats, error: statsError } = await supabase.rpc('get_dashboard_stats', {
        user_id_param: user.id
      });

      if (statsError) {
        console.error('Error fetching dashboard stats:', statsError);
        throw statsError;
      }

      const { data: recentEventsResult } = await supabase
        .from('events')
        .select('id, title, start_date, event_type, location')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(3);

      setStats({
        total_messages: (dashboardStats as any)?.total_conversations || 0,
        unread_messages: (dashboardStats as any)?.unread_conversations || 0,
        upcoming_events: (dashboardStats as any)?.upcoming_events || 0,
        total_employees: (dashboardStats as any)?.total_employees || 0,
        unread_notifications: (dashboardStats as any)?.unread_notifications || 0
      });

      setRecentEvents(recentEventsResult || []);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent events for activity feed
      const { data: recentEventsForActivity } = await supabase
        .from('events')
        .select(`
          id, 
          title, 
          created_at, 
          event_type, 
          location,
          created_by
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      // Get creator details for events
      const creatorIds = recentEventsForActivity?.map(event => event.created_by) || [];
      const { data: creators } = creatorIds.length > 0 ? await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', creatorIds) : { data: [] };

      // Combine notifications and events for activity feed
      const activity: RecentActivity[] = [
        // Add recent events to activity feed
        ...(recentEventsForActivity || []).map(event => {
          const creator = creators?.find(c => c.id === event.created_by);
          return {
            id: event.id,
            type: 'event' as const,
            title: `New Event: ${event.title}`,
            description: `${event.event_type}${event.location ? ` at ${event.location}` : ''}`,
            time: new Date(event.created_at).toLocaleString(),
            user: {
              name: creator ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() : 'Unknown User'
            }
          };
        }),
        // Add notifications
        ...(notifications || []).map(notification => ({
          id: notification.id,
          type: 'notification' as const,
          title: notification.title,
          description: notification.message,
          time: new Date(notification.created_at).toLocaleString()
        }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

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
      fetchUserRole();
      fetchDashboardData();
    }
  }, [user, authLoading, fetchDashboardData]);

  const fetchUserRole = async () => {
    if (!user) return;
    
    try {
      // Fetch role from user_roles table (proper security pattern)
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('role', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      setUserRole(data?.role || 'employee');
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('employee');
    }
  };

  // Initialize real-time notifications
  useRealtimeNotifications({ 
    onNotificationReceived: fetchDashboardData 
  });

  // Initialize notifications when component mounts
  useEffect(() => {
    notificationService.showPermissionPrompt();
  }, []);

  // Set up real-time subscriptions for dashboard updates
  useRealtimeSubscription('events', fetchDashboardData, [user]);
  useRealtimeSubscription('messages', fetchDashboardData, [user]);
  useRealtimeSubscription('notifications', fetchDashboardData, [user]);
  useRealtimeSubscription('profiles', () => {
    fetchUserRole();
    fetchDashboardData();
  }, [user]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const canAccessAdmin = userRole === 'super_admin' || userRole === 'admin';

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      'admin': 'admin'
    };
    
    if (tabMap[shortcut]) {
      handleTabChange(tabMap[shortcut]);
      
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
      <div className="min-h-dvh bg-background flex items-center justify-center safe-area-inset" role="status">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="sr-only">Loading employee portal</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col ios-fix">
      <a href="#portal-main" className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-primary px-4 py-2 text-primary-foreground shadow-lg transition-transform focus:translate-y-0">
        Skip to main content
      </a>
      <AppHeader 
        unreadNotifications={stats.unread_notifications}
        onNotificationCountChange={(count) => setStats(prev => ({ ...prev, unread_notifications: count }))}
        onNavigate={handleTabChange}
      />

      {/* Main Content - Enhanced PWA responsiveness */}
      <main id="portal-main" tabIndex={-1} className="flex-1 flex flex-col overflow-hidden safe-area-left safe-area-right">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 lg:py-6 pb-24 md:pb-5 lg:pb-6 flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
            {/* Phone: fixed bottom bar. Tablet: compact strip. Desktop: full navigation bar. */}
            <TabsList
              aria-label="Employee portal sections"
              className={`fixed inset-x-0 bottom-0 z-50 h-auto rounded-none border-x-0 border-b-0 bg-background/95 p-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur grid w-full ${
                canAccessAdmin ? 'grid-cols-6' : 'grid-cols-5'
              } md:static md:mb-5 md:flex md:w-full md:justify-start md:gap-1 md:overflow-x-auto md:rounded-lg md:border md:p-1.5 md:pb-1.5 md:shadow-sm lg:mb-6 lg:gap-2 lg:overflow-visible lg:p-2`}
            >
              <TabsTrigger
                value="dashboard"
                aria-label="Dashboard"
                className="relative min-w-0 flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] text-muted-foreground shadow-none after:absolute after:inset-x-3 after:top-0 after:h-0.5 after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none data-[state=active]:after:scale-x-100 md:min-w-fit md:flex-row md:gap-2 md:px-3 md:py-2.5 md:text-sm md:after:inset-x-2 md:after:bottom-0 md:after:top-auto lg:px-5 lg:data-[state=active]:bg-primary lg:data-[state=active]:text-primary-foreground lg:data-[state=active]:shadow-sm lg:data-[state=active]:after:scale-x-0"
              >
                <TrendingUp className="h-5 w-5 flex-shrink-0 md:h-4 md:w-4" />
                <span className="md:hidden">Home</span>
                <span className="hidden md:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger
                value="messages"
                aria-label="Messages"
                className="relative min-w-0 flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] text-muted-foreground shadow-none after:absolute after:inset-x-3 after:top-0 after:h-0.5 after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none data-[state=active]:after:scale-x-100 md:min-w-fit md:flex-row md:gap-2 md:px-3 md:py-2.5 md:text-sm md:after:inset-x-2 md:after:bottom-0 md:after:top-auto lg:px-5 lg:data-[state=active]:bg-primary lg:data-[state=active]:text-primary-foreground lg:data-[state=active]:shadow-sm lg:data-[state=active]:after:scale-x-0"
              >
                <MessageSquare className="h-5 w-5 flex-shrink-0 md:h-4 md:w-4" />
                <span className="md:hidden">Chat</span>
                <span className="hidden md:inline">Messages</span>
                {stats.unread_messages > 0 && (
                  <Badge variant="secondary" className="absolute right-1 top-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center md:static md:ml-1">
                    {stats.unread_messages > 9 ? '9+' : stats.unread_messages}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="events"
                aria-label="Events"
                className="relative min-w-0 flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] text-muted-foreground shadow-none after:absolute after:inset-x-3 after:top-0 after:h-0.5 after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none data-[state=active]:after:scale-x-100 md:min-w-fit md:flex-row md:gap-2 md:px-3 md:py-2.5 md:text-sm md:after:inset-x-2 md:after:bottom-0 md:after:top-auto lg:px-5 lg:data-[state=active]:bg-primary lg:data-[state=active]:text-primary-foreground lg:data-[state=active]:shadow-sm lg:data-[state=active]:after:scale-x-0"
              >
                <Calendar className="h-5 w-5 flex-shrink-0 md:h-4 md:w-4" />
                <span>Events</span>
              </TabsTrigger>
              <TabsTrigger
                value="employees"
                aria-label="Employee directory"
                className="relative min-w-0 flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] text-muted-foreground shadow-none after:absolute after:inset-x-3 after:top-0 after:h-0.5 after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none data-[state=active]:after:scale-x-100 md:min-w-fit md:flex-row md:gap-2 md:px-3 md:py-2.5 md:text-sm md:after:inset-x-2 md:after:bottom-0 md:after:top-auto lg:px-5 lg:data-[state=active]:bg-primary lg:data-[state=active]:text-primary-foreground lg:data-[state=active]:shadow-sm lg:data-[state=active]:after:scale-x-0"
              >
                <Users className="h-5 w-5 flex-shrink-0 md:h-4 md:w-4" />
                <span className="md:hidden">Team</span>
                <span className="hidden md:inline lg:hidden">Employees</span>
                <span className="hidden lg:inline">Employee Directory</span>
              </TabsTrigger>
              {canAccessAdmin && (
                <TabsTrigger
                  value="admin"
                  aria-label="Administration"
                  className="relative min-w-0 flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] text-muted-foreground shadow-none after:absolute after:inset-x-3 after:top-0 after:h-0.5 after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none data-[state=active]:after:scale-x-100 md:min-w-fit md:flex-row md:gap-2 md:px-3 md:py-2.5 md:text-sm md:after:inset-x-2 md:after:bottom-0 md:after:top-auto lg:px-5 lg:data-[state=active]:bg-primary lg:data-[state=active]:text-primary-foreground lg:data-[state=active]:shadow-sm lg:data-[state=active]:after:scale-x-0"
                >
                  <ShieldCheck className="h-5 w-5 flex-shrink-0 md:h-4 md:w-4" />
                  <span className="lg:hidden">Admin</span>
                  <span className="hidden lg:inline">Administration</span>
                </TabsTrigger>
              )}
              <TabsTrigger
                value="profile"
                aria-label="My profile"
                className="relative min-w-0 flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] text-muted-foreground shadow-none after:absolute after:inset-x-3 after:top-0 after:h-0.5 after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none data-[state=active]:after:scale-x-100 md:ml-auto md:min-w-fit md:flex-row md:gap-2 md:px-3 md:py-2.5 md:text-sm md:after:inset-x-2 md:after:bottom-0 md:after:top-auto lg:px-5 lg:data-[state=active]:bg-primary lg:data-[state=active]:text-primary-foreground lg:data-[state=active]:shadow-sm lg:data-[state=active]:after:scale-x-0"
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px]">
                    {getInitials(user.email || 'U')}
                  </AvatarFallback>
                </Avatar>
                <span className="lg:hidden">Profile</span>
                <span className="hidden lg:inline">My Profile</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="dashboard" className="space-y-3 sm:space-y-6 h-full overflow-y-auto">
                {/* Welcome Section - PWA optimized */}
                <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-6">
                  <h2 className="text-lg sm:text-2xl font-bold text-card-foreground mb-1 sm:mb-2">
                    Welcome back! 👋
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Here's what's happening in your organization today.
                  </p>
                </div>

                {/* Stats Cards - Mobile optimized with better spacing */}
                <div className="grid grid-cols-2 gap-2 sm:gap-6">
                  <Card>
                    <Button variant="ghost" className="h-auto w-full justify-start whitespace-normal p-0 text-left" onClick={() => handleShortcutClick('messages')} aria-label={`Open messages, ${stats.unread_messages} unread`}>
                    <CardContent className="w-full p-3 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-600">Conversations</p>
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
                    </CardContent></Button>
                  </Card>

                  <Card>
                    <Button variant="ghost" className="h-auto w-full justify-start whitespace-normal p-0 text-left" onClick={() => handleShortcutClick('events')} aria-label={`Open events, ${stats.upcoming_events} upcoming`}>
                    <CardContent className="w-full p-3 sm:p-6">
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
                    </CardContent></Button>
                  </Card>

                  <Card>
                    <Button variant="ghost" className="h-auto w-full justify-start whitespace-normal p-0 text-left" onClick={() => handleShortcutClick('employees')} aria-label={`Open employee directory, ${stats.total_employees} employees`}>
                    <CardContent className="w-full p-3 sm:p-6">
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
                    </CardContent></Button>
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

              <TabsContent value="admin" className="h-full overflow-y-auto">
                <AdminDashboard />
              </TabsContent>

              <TabsContent value="profile" className="h-full overflow-y-auto">
                <ProfileMenu />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border/40 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Built and Developed at MIS Office
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
