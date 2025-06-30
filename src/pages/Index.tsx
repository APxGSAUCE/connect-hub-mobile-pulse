
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Calendar, MessageSquare, Plus, Bell, Users, BarChart3, User, LogOut, Loader2 } from "lucide-react";
import TaskManager from "@/components/TaskManager";
import EventCalendar from "@/components/EventCalendar";
import MessageCenter from "@/components/MessageCenter";
import ProfileMenu from "@/components/ProfileMenu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ActiveTab = 'dashboard' | 'tasks' | 'events' | 'messages' | 'profile';

const Index = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      fetchProfile();
    }
  }, [user, loading, navigate]);

  const fetchProfile = async () => {
    if (!user) return;
    
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      
      if (data) {
        setUserProfile(data);
      } else {
        // Set default profile data
        setUserProfile({
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          email: user.email
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoadingProfile(false);
    }
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
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'tasks':
        return <TaskManager />;
      case 'events':
        return <EventCalendar />;
      case 'messages':
        return <MessageCenter />;
      case 'profile':
        return <ProfileMenu />;
      default:
        return <Dashboard setActiveTab={setActiveTab} userProfile={userProfile} />;
    }
  };

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading PGIS Connect...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = userProfile 
    ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || user.email
    : user.email;

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Mobile-Optimized Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900">PGIS Connect</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                  3
                </span>
              </Button>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {getInitials(displayName)}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Mobile Padding */}
      <div className="px-4 sm:px-6 py-4 pb-20">
        {renderContent()}
      </div>

      {/* Enhanced Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="grid grid-cols-5 h-16">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'tasks', icon: CheckCircle2, label: 'Tasks' },
            { id: 'events', icon: Calendar, label: 'Events' },
            { id: 'messages', icon: MessageSquare, label: 'Messages' },
            { id: 'profile', icon: User, label: 'Profile' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 ${
                activeTab === item.id
                  ? 'text-blue-600 bg-blue-50 scale-105'
                  : 'text-gray-600 hover:text-blue-600 active:scale-95'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

// Mobile-Optimized Dashboard Component
const Dashboard = ({ setActiveTab, userProfile }: { setActiveTab: (tab: ActiveTab) => void, userProfile: any }) => {
  const firstName = userProfile?.first_name || 'User';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">Welcome back, {firstName}!</h2>
        <p className="text-gray-600 text-sm">Here's what's happening today</p>
      </div>

      {/* Mobile-Optimized Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="hover:shadow-md transition-shadow active:scale-95">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-xl font-bold">12</p>
                <p className="text-xs text-gray-600">Active Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow active:scale-95">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-xl font-bold">3</p>
                <p className="text-xs text-gray-600">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow active:scale-95">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-6 h-6 text-purple-600" />
              <div>
                <p className="text-xl font-bold">8</p>
                <p className="text-xs text-gray-600">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow active:scale-95">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="w-6 h-6 text-orange-600" />
              <div>
                <p className="text-xl font-bold">5</p>
                <p className="text-xs text-gray-600">Team</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile-Optimized Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-base">
            <Plus className="w-4 h-4" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            onClick={() => setActiveTab('tasks')} 
            className="w-full justify-start h-12 active:scale-95 transition-transform" 
            variant="outline"
          >
            <CheckCircle2 className="w-4 h-4 mr-3" />
            Create New Task
          </Button>
          <Button 
            onClick={() => setActiveTab('events')} 
            className="w-full justify-start h-12 active:scale-95 transition-transform" 
            variant="outline"
          >
            <Calendar className="w-4 h-4 mr-3" />
            Schedule Event
          </Button>
          <Button 
            onClick={() => setActiveTab('messages')} 
            className="w-full justify-start h-12 active:scale-95 transition-transform" 
            variant="outline"
          >
            <MessageSquare className="w-4 h-4 mr-3" />
            Send Message
          </Button>
        </CardContent>
      </Card>

      {/* Mobile-Optimized Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg active:bg-gray-100 transition-colors">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Task completed</p>
              <p className="text-xs text-gray-600 truncate">Website redesign review</p>
            </div>
            <Badge variant="secondary" className="text-xs">2h</Badge>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg active:bg-gray-100 transition-colors">
            <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">New message</p>
              <p className="text-xs text-gray-600 truncate">From Sarah Johnson</p>
            </div>
            <Badge variant="secondary" className="text-xs">1d</Badge>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg active:bg-gray-100 transition-colors">
            <Calendar className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Event scheduled</p>
              <p className="text-xs text-gray-600 truncate">Team meeting tomorrow</p>
            </div>
            <Badge variant="secondary" className="text-xs">2d</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
