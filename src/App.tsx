
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App = () => {
  useEffect(() => {
    // PWA Service Worker registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
          
          console.log('Service Worker registered successfully:', registration);
          
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New version available');
                }
              });
            }
          });
          
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      });
    }

    // Mobile viewport handling for PWA
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    // Prevent iOS bounce scrolling for PWA
    const preventBounce = (e: TouchEvent) => {
      const target = e.target as Element;
      const scrollableParent = target.closest('[data-scrollable]');
      
      if (!scrollableParent && e.touches.length === 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventBounce, { passive: false });

    // PWA install prompt handling
    let deferredPrompt: any;
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      // Store the event for later use
      window.deferredPrompt = deferredPrompt;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // PWA theme color based on system preference
    const updateThemeColor = () => {
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const color = isDark ? '#0f172a' : '#3b82f6';
      
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', color);
      }
    };

    updateThemeColor();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeColor);

    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
      document.removeEventListener('touchmove', preventBounce);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', updateThemeColor);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <div className="min-h-screen ios-fix">
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<Index />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
