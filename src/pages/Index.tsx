
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Calendar, 
  Users, 
  Home,
  Bell,
  LogOut,
  Plus,
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

  const activeTab = searchParams.get("tab") || "dashboard";

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchDashboardStats();
  }, [user, navigate]);

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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white border-r">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">iSurve Portal</h1>
            </div>
          </div>
          
          <div className="mt-8 flex-grow flex flex-col">
            <nav className="flex-1 px-4 space-y-2">
              <button
                onClick={() => handleTabChange("dashboard")}
                className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "dashboard"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Home className="mr-3 h-5 w-5" />
                Dashboard
              </button>
              
              <button
                onClick={() => handleTabChange("messages")}
                className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "messages"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <MessageSquare className="mr-3 h-5 w-5" />
                Messages
                <Badge variant="secondary" className="ml-auto">
                  {stats.totalMessages}
                </Badge>
              </button>
              
              <button
                onClick={() => handleTabChange("events")}
                className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "events"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Calendar className="mr-3 h-5 w-5" />
                Events
                <Badge variant="secondary" className="ml-auto">
                  {stats.upcomingEvents}
                </Badge>
              </button>
              
              <button
                onClick={() => handleTabChange("people")}
                className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "people"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Users className="mr-3 h-5 w-5" />
                People
                <Badge variant="secondary" className="ml-auto">
                  {stats.totalEmployees}
                </Badge>
              </button>
            </nav>
            
            <div className="flex-shrink-0 p-4 border-t">
              <div className="flex items-center justify-between">
                <ProfileMenu />
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
        {/* Mobile header */}
        <div className="md:hidden bg-white shadow-sm border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">iSurve Portal</h1>
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-gray-600" />
              <ProfileMenu />
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden bg-white border-b">
          <nav className="flex overflow-x-auto">
            <button
              onClick={() => handleTabChange("dashboard")}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "dashboard"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Home className="w-4 h-4 mx-auto mb-1" />
              Dashboard
            </button>
            <button
              onClick={() => handleTabChange("messages")}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "messages"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <MessageSquare className="w-4 h-4 mx-auto mb-1" />
              Messages
            </button>
            <button
              onClick={() => handleTabChange("events")}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "events"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Calendar className="w-4 h-4 mx-auto mb-1" />
              Events
            </button>
            <button
              onClick={() => handleTabChange("people")}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "people"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users className="w-4 h-4 mx-auto mb-1" />
              People
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="h-full">
            {activeTab === "dashboard" && (
              <div className="p-4 md:p-6 space-y-6">
                {/* Welcome Section */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Welcome back, {user.user_metadata?.first_name || user.email}!
                  </h2>
                  <p className="text-gray-600">Here's what's happening in your organization today.</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalMessages}</div>
                      <p className="text-xs text-muted-foreground">
                        Across all conversations
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
                      <p className="text-xs text-muted-foreground">
                        Next 7 days
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalEvents}</div>
                      <p className="text-xs text-muted-foreground">
                        All scheduled events
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                      <p className="text-xs text-muted-foreground">
                        Active employees
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card>
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
                          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left group"
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform`}>
                              <action.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{action.title}</h3>
                              <p className="text-sm text-gray-600">{action.description}</p>
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
      </div>
    </div>
  );
};

export default Index;
