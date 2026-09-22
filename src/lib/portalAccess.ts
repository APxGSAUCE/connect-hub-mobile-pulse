import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type PortalSection = "dashboard" | "messages" | "events" | "employees" | "admin" | "profile";

export interface PortalPermissions {
  role: AppRole;
  isManager: boolean;
  canCreateMessages: boolean;
  canCreateEvents: boolean;
  canReviewDepartmentApprovals: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  allowedSections: PortalSection[];
}

const employeeSections: PortalSection[] = ["dashboard", "messages", "events", "employees", "profile"];

export const getPortalPermissions = (role: AppRole, headsDepartment = false): PortalPermissions => {
  const isManager = role === "dept_head" || headsDepartment;
  const canManageUsers = role === "admin" || role === "super_admin";

  return {
    role,
    isManager,
    canCreateMessages: isManager || canManageUsers,
    canCreateEvents: isManager || canManageUsers,
    canReviewDepartmentApprovals: isManager || canManageUsers,
    canManageUsers,
    canManageRoles: role === "super_admin",
    allowedSections: canManageUsers ? [...employeeSections, "admin"] : employeeSections,
  };
};

export const roleLabel = (role: AppRole) => {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Administrator";
  if (role === "dept_head") return "Department Head";
  return "Employee";
};