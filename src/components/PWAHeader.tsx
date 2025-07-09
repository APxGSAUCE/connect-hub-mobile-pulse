
import { Button } from '@/components/ui/button';
import { Bell, Search } from 'lucide-react';
import ProfileMenu from './ProfileMenu';

interface PWAHeaderProps {
  title: string;
  onMenuClick?: () => void;
  showSearch?: boolean;
  onSearchClick?: () => void;
}

const PWAHeader = ({ title, onMenuClick, showSearch = false, onSearchClick }: PWAHeaderProps) => {
  return (
    <header className="pwa-header bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">OS</span>
            </div>
            <h1 className="text-lg font-semibold text-foreground line-clamp-1">
              {title}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="btn-mobile focus-mobile relative"
          >
            <Bell className="w-5 h-5" />
          </Button>
          
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
        </div>
      </div>
    </header>
  );
};

export default PWAHeader;
