import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { PortalSection } from "@/lib/portalAccess";

const PAGE_COPY: Record<PortalSection, { title: string; description: string }> = {
  dashboard: { title: "Dashboard", description: "Your portal overview and latest updates" },
  messages: { title: "Messages", description: "Conversations with your colleagues" },
  events: { title: "Events", description: "Upcoming schedules and organization activities" },
  employees: { title: "Employee Directory", description: "Find and connect with your colleagues" },
  admin: { title: "Administration", description: "Manage people, departments, roles, and approvals" },
  profile: { title: "My Profile", description: "Your account details and permissions" },
};

export const getPortalPageTitle = (section: PortalSection) => PAGE_COPY[section].title;

export const PortalPageHeader = ({ section }: { section: PortalSection }) => {
  const copy = PAGE_COPY[section];
  return (
    <div className="mb-4 border-b pb-4 sm:mb-5">
      <Breadcrumb>
        <BreadcrumbList className="flex-nowrap overflow-hidden text-xs sm:text-sm">
          <BreadcrumbItem className="hidden sm:inline-flex">
            <BreadcrumbLink asChild><Link to="/">Employee Portal</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden sm:list-item" />
          {section !== "dashboard" && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/">Portal</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate font-medium">{copy.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="mt-2">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
      </div>
    </div>
  );
};