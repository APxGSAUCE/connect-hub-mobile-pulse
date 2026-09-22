import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Calendar, Home, MessageSquare, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "Unknown portal URL:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <main className="min-h-dvh bg-background safe-area-inset">
      <header className="border-b bg-background">
        <div className="app-header-alignment flex h-16 items-center gap-3">
          <img
            src="/lovable-uploads/ee362ced-371f-4ebd-a238-94b33ae86a02.png"
            alt="Province of Ilocos Sur seal"
            className="h-9 w-9 object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground sm:text-base">PGIS EMPLOYEE PORTAL</p>
            <p className="text-xs text-muted-foreground">Province of Ilocos Sur</p>
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center sm:py-24">
        <p className="mb-3 text-sm font-semibold text-primary">PAGE NOT FOUND</p>
        <h1 className="text-3xl font-bold text-foreground sm:text-5xl">This portal link is no longer available</h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          The address may be outdated or incomplete. Choose a section below to continue safely.
        </p>

        <Button asChild size="lg" className="mt-8">
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Go to portal home
          </Link>
        </Button>

        <nav aria-label="Portal destinations" className="mt-10 w-full border-t pt-8">
          <p className="mb-4 text-sm font-medium text-foreground">Portal sections</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Button asChild variant="outline" className="h-auto min-h-20 flex-col gap-2 whitespace-normal py-3">
              <Link to="/messages"><MessageSquare className="h-5 w-5" /><span>Messages</span></Link>
            </Button>
            <Button asChild variant="outline" className="h-auto min-h-20 flex-col gap-2 whitespace-normal py-3">
              <Link to="/events"><Calendar className="h-5 w-5" /><span>Events</span></Link>
            </Button>
            <Button asChild variant="outline" className="h-auto min-h-20 flex-col gap-2 whitespace-normal py-3">
              <Link to="/employees"><Users className="h-5 w-5" /><span>Employees</span></Link>
            </Button>
            <Button asChild variant="outline" className="h-auto min-h-20 flex-col gap-2 whitespace-normal py-3">
              <Link to="/profile"><UserRound className="h-5 w-5" /><span>My profile</span></Link>
            </Button>
          </div>
        </nav>

        <Button variant="ghost" className="mt-6" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go back
        </Button>
      </section>
    </main>
  );
};

export default NotFound;
