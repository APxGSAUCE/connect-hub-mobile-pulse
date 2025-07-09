
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, MessageSquare, Calendar, Users, User } from 'lucide-react';

interface MobileTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  stats: {
    totalMessages: number;
    upcomingEvents: number;
    totalEmployees: number;
    unreadNotifications?: number;
  };
}

const MobileTabBar = ({ activeTab, onTabChange, stats }: MobileTabBarProps) => {
  const tabs = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: Home,
      badge: null
    },
    {
      id: 'messages',
      label: 'Chat',
      icon: MessageSquare,
      badge: stats.totalMessages > 0 ? stats.totalMessages : null
    },
    {
      id: 'events',
      label: 'Events',
      icon: Calendar,
      badge: stats.upcomingEvents > 0 ? stats.upcomingEvents : null
    },
    {
      id: 'people',
      label: 'People',
      icon: Users,
      badge: null
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      badge: null
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border safe-area-bottom z-50">
      <nav className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center space-y-1 p-3 h-auto min-h-[64px] flex-1 touch-manipulation relative transition-all duration-200 ${
              activeTab === tab.id
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            <div className="relative">
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-primary' : ''}`} />
              {tab.badge && tab.badge > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 min-w-[16px] h-4 text-[10px] px-1 flex items-center justify-center"
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </Badge>
              )}
            </div>
            <span className={`text-xs font-medium ${activeTab === tab.id ? 'text-primary' : ''}`}>
              {tab.label}
            </span>
          </Button>
        ))}
      </nav>
    </div>
  );
};

export default MobileTabBar;
