
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Calendar, 
  Users, 
  Home,
  LogOut,
  TrendingUp,
  Clock,
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SimpleMessageCenter from "@/components/SimpleMessageCenter";
import EventCalendar from "@/components/EventCalendar";
import EmployeeManagement from "@/components/EmployeeManagement";
import ProfileMenu from "@/components/ProfileMenu";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWAHeader from "@/components/PWAHeader";
import MobileTabBar from "@/components/MobileTabBar";
import OfflineIndicator from "@/components/OfflineIndicator";
import { usePWA } from "@/hooks/usePWA";

interface DashboardStats {
  totalMessages: number;
  totalEvents: number;
  totalEmployees: number;
  upcomingEvents: number;
}

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stats, setStats] = useState<DashboardStats>({
    totalMessages: 0,
    totalEvents: 0,
    totalEmployees: 0,
    upcomingEvents: 0
  });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pwa = usePWA();

  const activeTab = searchParams.get("tab") || "dashboard";

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchDashboardStats();
  }, [user, navigate]);

  // Add PWB-specific body class
  useEffect(() => {
    if (pwa.isStandalone) {
      document.body.classList.add('pwa-standalone');
    } else {
      document.body.classList.remove('pwa-standalone');
    }
  }, [pwa.isStandalone]);

  const fetchDashboardStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch message count from user's groups
      const { data: groupsData } = await supabase
        .from('chat_group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const groupIds = groupsData?.map(g => g.group_id) || [];
      
      let messageCount = 0;
      if (groupIds.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('group_id', groupIds);
        messageCount = count || 0;
      }

      // Fetch events count
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });

      // Fetch employees count
      const { count: employeesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch upcoming events (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const { count: upcomingCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('start_date', new Date().toISOString())
        .lte('start_date', nextWeek.toISOString());

      setStats({
        totalMessages: messageCount,
        totalEvents: eventsCount || 0,
        totalEmployees: employeesCount || 0,
        upcomingEvents: upcomingCount || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
    setSidebarOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      navigate("/auth");
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const quickActions = [
    {
      title: "Messages",
      description: "Start a conversation",
      icon: MessageSquare,
      color: "bg-blue-500",
      action: () => handleTabChange("messages")
    },
    {
      title: "Events",
      description: "Schedule a meeting",
      icon: Calendar,
      color: "bg-green-500",
      action: () => handleTabChange("events")
    },
    {
      title: "People",
      description: "Manage team members",
      icon: Users,
      color: "bg-purple-500",
      action: () => handleTabChange("people")
    }
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden ios-fix">
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-card border-r border-border">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Home className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">iSurve Portal</h1>
            </div>
          </div>
          
          <div className="mt-8 flex-grow flex flex-col">
            <nav className="flex-1 px-4 space-y-2">
              <button
                onClick={() => handleTabChange("dashboard")}
                className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors touch-manipulation ${
                  activeTab === "dashboard"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Home className="mr-3 h-5 w-5" />
                Dashboard
              </button>
              
              <button
                onClick={() => handleTabChange("messages")}
                className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors touch-manipulation ${
                  activeTab === "messages"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <MessageSquare className="mr-3 h-5 w-5" />
                Messages
                {stats.totalMessages > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {stats.totalMessages}
                  </Badge>
                )}
              </button>
              
              <button
                onClick={() => handleTabChange("events")}
                className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors touch-manipulation ${
                  activeTab === "events"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Calendar className="mr-3 h-5 w-5" />
                Events
                {stats.upcomingEvents > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {stats.upcomingEvents}
                  </Badge>
                )}
              </button>
              
              <button
                onClick={() => handleTabChange("people")}
                className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors touch-manipulation ${
                  activeTab === "people"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Users className="mr-3 h-5 w-5" />
                People
                {stats.totalEmployees > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {stats.totalEmployees}
                  </Badge>
                )}
              </button>
            </nav>
            
            <div className="flex-shrink-0 p-4 border-t border-border">
              <div className="flex items-center justify-between">
                <ProfileMenu />
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile Header */}
        <PWAHeader 
          title={
            activeTab === "dashboard" ? "Dashboard" :
            activeTab === "messages" ? "Messages" :
            activeTab === "events" ? "Events" :
            activeTab === "people" ? "People" : "iSurve Portal"
          }
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          showSearch={activeTab === "messages" || activeTab === "people"}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-background pb-20 md:pb-0">
          <div className="h-full">
            {activeTab === "dashboard" && (
              <div className="p-4 md:p-6 space-y-6">
                {/* Welcome Section */}
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Welcome back, {user.user_metadata?.first_name || user.email}!
                  </h2>
                  <p className="text-muted-foreground">Here's what's happening in your organization today.</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="touch-manipulation">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Messages</CardTitle>
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalMessages}</div>
                      <p className="text-xs text-muted-foreground">
                        All conversations
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="touch-manipulation">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
                      <p className="text-xs text-muted-foreground">
                        Next 7 days
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="touch-manipulation">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Events</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalEvents}</div>
                      <p className="text-xs text-muted-foreground">
                        Total scheduled
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="touch-manipulation">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Team</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                      <p className="text-xs text-muted-foreground">
                        Active members
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card className="touch-manipulation">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                      Common tasks to get you started
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {quickActions.map((action, index) => (
                        <button
                          key={index}
                          onClick={action.action}
                          className="p-4 border border-border rounded-lg hover:bg-accent transition-colors text-left group touch-manipulation"
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform`}>
                              <action.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-medium text-foreground">{action.title}</h3>
                              <p className="text-sm text-muted-foreground">{action.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "messages" && <SimpleMessageCenter />}
            {activeTab === "events" && <EventCalendar />}
            {activeTab === "people" && <EmployeeManagement />}
          </div>
        </main>

        {/* Mobile Tab Bar */}
        <MobileTabBar 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          stats={stats}
        />
      </div>
    </div>
  );
};

export default Index;
