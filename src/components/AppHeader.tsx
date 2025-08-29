import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useToast } from "@/hooks/use-toast";

interface AppHeaderProps {
  unreadNotifications: number;
  onNotificationCountChange: (count: number) => void;
}

export const AppHeader = ({ unreadNotifications, onNotificationCountChange }: AppHeaderProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

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

  return (
    <header className="bg-white shadow-sm border-b flex-shrink-0 pwa-header sticky top-0 z-40">
      <div className="app-header-alignment">
        <div className="header-title-align">
          {/* Logo and Title */}
          <div className="header-logo-title">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0">
              <img 
                src="/lovable-uploads/ee362ced-371f-4ebd-a238-94b33ae86a02.png" 
                alt="Province of Ilocos Sur Logo" 
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <h1 className="text-sm sm:text-lg font-bold text-gray-900 truncate">
              PGIS EMPLOYEE PORTAL
            </h1>
          </div>
          
          {/* Right side - Notifications, Profile and Sign Out */}
          <div className="header-actions">
            <NotificationCenter 
              unreadCount={unreadNotifications} 
              onCountChange={onNotificationCountChange}
            />
            
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Avatar className="w-6 h-6 sm:w-8 sm:h-8">
                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                  {getInitials(user?.email || 'User')}
                </AvatarFallback>
              </Avatar>
              
              {/* Desktop Sign Out Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut} 
                className="hidden sm:inline-flex text-sm px-3 py-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/20 hover:bg-destructive/5 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Sign Out
              </Button>
              
              {/* Mobile Sign Out Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut} 
                className="sm:hidden p-2 text-muted-foreground hover:text-destructive hover:border-destructive/20 hover:bg-destructive/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};