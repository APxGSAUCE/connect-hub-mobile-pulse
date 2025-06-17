
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Calendar, MessageSquare, Upload, Download, Plus, Bell, Users, BarChart3, Menu } from "lucide-react";
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
      {/* Mobile-Optimized Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50 safe-area-top">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900">EmployeeHub</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                  3
                </span>
              </Button>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">JD</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Mobile Padding */}
      <div className="px-4 sm:px-6 py-4 pb-20">
        {renderContent()}
      </div>

      {/* Enhanced Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg safe-area-bottom">
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
const Dashboard = ({ setActiveTab }: { setActiveTab: (tab: ActiveTab) => void }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">Welcome back, John!</h2>
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
              <Upload className="w-6 h-6 text-orange-600" />
              <div>
                <p className="text-xl font-bold">25</p>
                <p className="text-xs text-gray-600">Files</p>
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
            onClick={() => setActiveTab('files')} 
            className="w-full justify-start h-12 active:scale-95 transition-transform" 
            variant="outline"
          >
            <Upload className="w-4 h-4 mr-3" />
            Upload File
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
            <Upload className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">File uploaded</p>
              <p className="text-xs text-gray-600 truncate">Project proposal.pdf</p>
            </div>
            <Badge variant="secondary" className="text-xs">2d</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
