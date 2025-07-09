
import { Button } from '@/components/ui/button';
import { Bell, Menu, Search } from 'lucide-react';
import ProfileMenu from './ProfileMenu';

interface PWAHeaderProps {
  title: string;
  onMenuClick?: () => void;
  showSearch?: boolean;
  onSearchClick?: () => void;
}

const PWAHeader = ({ title, onMenuClick, showSearch = false, onSearchClick }: PWAHeaderProps) => {
  return (
    <header className="pwa-header bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="md:hidden btn-mobile focus-mobile"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <h1 className="text-lg font-semibold text-foreground line-clamp-1">
            {title}
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          {showSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSearchClick}
              className="btn-mobile focus-mobile"
            >
              <Search className="w-5 h-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="btn-mobile focus-mobile relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-xs flex items-center justify-center text-destructive-foreground">
              3
            </span>
          </Button>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
};

export default PWAHeader;
