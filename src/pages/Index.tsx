
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Calendar, MessageSquare, Upload, Download, Plus, Bell, Users, BarChart3 } from "lucide-react";
import TaskManager from "@/components/TaskManager";
import EventCalendar from "@/components/EventCalendar";
import MessageCenter from "@/components/MessageCenter";
import FileManager from "@/components/FileManager";

type ActiveTab = 'dashboard' | 'tasks' | 'events' | 'messages' | 'files';

const Index = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'tasks':
        return <TaskManager />;
      case 'events':
        return <EventCalendar />;
      case 'messages':
        return <MessageCenter />;
      case 'files':
        return <FileManager />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">EmployeeHub</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">JD</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg md:hidden">
        <div className="grid grid-cols-5 h-16">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'tasks', icon: CheckCircle2, label: 'Tasks' },
            { id: 'events', icon: Calendar, label: 'Events' },
            { id: 'messages', icon: MessageSquare, label: 'Messages' },
            { id: 'files', icon: Upload, label: 'Files' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                activeTab === item.id
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <nav className="hidden md:block fixed left-0 top-16 bottom-0 w-64 bg-white border-r overflow-y-auto">
        <div className="p-4 space-y-2">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'tasks', icon: CheckCircle2, label: 'Tasks' },
            { id: 'events', icon: Calendar, label: 'Events' },
            { id: 'messages', icon: MessageSquare, label: 'Messages' },
            { id: 'files', icon: Upload, label: 'Files' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop Content Offset */}
      <style jsx>{`
        @media (min-width: 768px) {
          .max-w-7xl {
            margin-left: 16rem;
            max-width: calc(100% - 16rem);
          }
        }
      `}</style>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ setActiveTab }: { setActiveTab: (tab: ActiveTab) => void }) => {
  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, John!</h2>
        <p className="text-gray-600">Here's what's happening in your workspace today.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-gray-600">Active Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-gray-600">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-sm text-gray-600">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Upload className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">25</p>
                <p className="text-sm text-gray-600">Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => setActiveTab('tasks')} 
              className="w-full justify-start" 
              variant="outline"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Create New Task
            </Button>
            <Button 
              onClick={() => setActiveTab('events')} 
              className="w-full justify-start" 
              variant="outline"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Event
            </Button>
            <Button 
              onClick={() => setActiveTab('files')} 
              className="w-full justify-start" 
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Task completed</p>
                <p className="text-xs text-gray-600">Website redesign review</p>
              </div>
              <Badge variant="secondary">2h ago</Badge>
            </div>
            <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">New message</p>
                <p className="text-xs text-gray-600">From Sarah Johnson</p>
              </div>
              <Badge variant="secondary">1d ago</Badge>
            </div>
            <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
              <Upload className="w-4 h-4 text-orange-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">File uploaded</p>
                <p className="text-xs text-gray-600">Project proposal.pdf</p>
              </div>
              <Badge variant="secondary">2d ago</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
