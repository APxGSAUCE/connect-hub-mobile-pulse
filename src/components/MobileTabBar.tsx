
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, MessageSquare, Calendar, Users } from 'lucide-react';

interface MobileTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  stats: {
    totalMessages: number;
    upcomingEvents: number;
    totalEmployees: number;
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
      label: 'Messages',
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
    }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border safe-area-bottom z-50">
      <nav className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center space-y-1 p-2 h-auto min-h-[60px] flex-1 touch-manipulation relative ${
              activeTab === tab.id
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="relative">
              <tab.icon className="w-5 h-5" />
              {tab.badge && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 min-w-[16px] h-4 text-xs px-1 flex items-center justify-center"
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </Badge>
              )}
            </div>
            <span className="text-xs font-medium">{tab.label}</span>
          </Button>
        ))}
      </nav>
    </div>
  );
};

export default MobileTabBar;
