
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
  CheckCircle,
  Bell,
  Activity
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
  unreadNotifications: number;
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
    upcomingEvents: 0,
    unreadNotifications: 0
  });
  const [loading, setLoading] = useState(true);
  const pwa = usePWA();

  const activeTab = searchParams.get("tab") || "dashboard";

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchDashboardStats();
  }, [user, navigate]);

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

      // Fetch unread notifications
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setStats({
        totalMessages: messageCount,
        totalEvents: eventsCount || 0,
        totalEmployees: employeesCount || 0,
        upcomingEvents: upcomingCount || 0,
        unreadNotifications: unreadCount || 0
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

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* PWA Header */}
      <PWAHeader 
        title={
          activeTab === "dashboard" ? "One Ilocos Sur Portal" :
          activeTab === "messages" ? "Chat" :
          activeTab === "events" ? "Events" :
          activeTab === "people" ? "People" : "One Ilocos Sur Portal"
        }
        showSearch={activeTab === "messages" || activeTab === "people"}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background pb-20 safe-area-bottom">
        <div className="h-full">
          {activeTab === "dashboard" && (
            <div className="p-4 space-y-6">
              {/* Welcome Section */}
              <div className="text-center pt-4">
                <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                  Welcome back! 👋
                </h2>
                <p className="text-muted-foreground mt-2">Here's what's happening in your organization today.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="touch-manipulation app-transition hover:scale-105">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Messages</CardTitle>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold">{stats.totalMessages}</div>
                  </CardContent>
                </Card>

                <Card className="touch-manipulation app-transition hover:scale-105">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Events</CardTitle>
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Calendar className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold">{stats.totalEvents}</div>
                    <p className="text-xs text-green-600 font-medium">Upcoming</p>
                  </CardContent>
                </Card>

                <Card className="touch-manipulation app-transition hover:scale-105">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Team</CardTitle>
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="h-4 w-4 text-purple-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                    <p className="text-xs text-purple-600 font-medium">Active users</p>
                  </CardContent>
                </Card>

                <Card className="touch-manipulation app-transition hover:scale-105">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Notifications</CardTitle>
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Bell className="h-4 w-4 text-orange-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold">{stats.unreadNotifications}</div>
                    <p className="text-xs text-orange-600 font-medium">Unread</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity Section */}
              <Card className="touch-manipulation">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                      <Activity className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">No recent activity</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "messages" && <SimpleMessageCenter />}
          {activeTab === "events" && <EventCalendar />}
          {activeTab === "people" && <EmployeeManagement />}
          {activeTab === "profile" && (
            <div className="p-4 space-y-6">
              <div className="flex items-center justify-center">
                <ProfileMenu />
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={handleSignOut}
                  variant="destructive"
                  className="w-full max-w-sm touch-manipulation"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <MobileTabBar 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        stats={stats}
      />
    </div>
  );
};

export default Index;
