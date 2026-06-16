import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Organization, OrganizationMember, OrgRole } from "@/types/database";
import { isWorkspaceAdmin as computeIsWorkspaceAdmin, type WorkspaceRole } from "@/config/hierarchy";

const DEV_USER = { id: "dev-user", email: "dev@fabric59.com" } as User;
const DEV_ORG: Organization = {
  id: "dev-org",
  name: "Dev Organization",
  billing_email: "dev@fabric59.com",
  plan: "pro",
  status: "active",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  brand_name: null,
  brand_logo_url: null,
  brand_primary_color: null,
  brand_from_email: null,
  brand_reply_to: null,
  integration_configs: {},
};
const DEV_MEMBERSHIP: OrganizationMember = {
  id: "dev-membership",
  organization_id: "dev-org",
  user_id: "dev-user",
  role: "owner",
  created_at: new Date().toISOString(),
};

const ALL_PERMISSIONS = [
  "agents", "tenants", "domains", "integrations", "mappings",
  "logs", "test_console", "notifications", "settings", "call_flow",
];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  organization: Organization | null;
  membership: OrganizationMember | null;
  organizations: Organization[];
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * @deprecated Use `workspaceRole` (and `isWorkspaceAdmin`) from useAuth().
   * Kept temporarily for backward compatibility — see follow-up cleanup ticket.
   */
  orgRole: OrgRole | null;
  /** Workspace-scoped role sourced from organization_members.role. */
  workspaceRole: WorkspaceRole | null;
  /** True when workspaceRole is 'owner' or 'admin'. */
  isWorkspaceAdmin: boolean;
  isMasterAdmin: boolean;
  devMode: boolean;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  toggleDevMode: () => void;
  signUp: (email: string, password: string, orgName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
  refreshOrganizations: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isOrgLoading, setIsOrgLoading] = useState(true);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);

  const toggleDevMode = () => {
    if (!import.meta.env.DEV) return;
    setDevMode((prev) => !prev);
  };

  // Load permissions for a user in an org
  const loadPermissions = async (userId: string, orgId: string, role: OrgRole | null) => {
    // Owners and admins have all permissions
    if (role === "owner" || role === "admin") {
      setPermissions(ALL_PERMISSIONS);
      return;
    }
    try {
      const { data } = await supabase
        .from("user_permissions")
        .select("permission")
        .eq("user_id", userId)
        .eq("organization_id", orgId);
      setPermissions(data?.map((d) => d.permission) || []);
    } catch {
      setPermissions([]);
    }
  };

  const checkMasterAdmin = async (userId: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "master_admin")
        .single();
      const isMaster = !!data;
      setIsMasterAdmin(isMaster);
      if (isMaster) setPermissions(ALL_PERMISSIONS);
      return isMaster;
    } catch {
      setIsMasterAdmin(false);
      return false;
    }
  };

  const loadOrganizations = async (userId: string) => {
    setIsOrgLoading(true);
    try {
      const { data: memberships, error: membError } = await supabase
        .from("organization_members")
        .select("*")
        .eq("user_id", userId);

      if (membError) throw membError;

      if (!memberships || memberships.length === 0) {
        const isMaster = await checkMasterAdmin(userId);
        if (isMaster) {
          const { data: allOrgs } = await supabase.from("organizations").select("*");
      const typedAllOrgs: Organization[] = (allOrgs || []).map((o) => ({
            id: o.id, name: o.name, billing_email: o.billing_email,
            plan: o.plan as Organization["plan"], status: o.status as Organization["status"],
            created_at: o.created_at, updated_at: o.updated_at,
            brand_name: (o as Record<string, unknown>).brand_name as string | null ?? null,
            brand_logo_url: (o as Record<string, unknown>).brand_logo_url as string | null ?? null,
            brand_primary_color: (o as Record<string, unknown>).brand_primary_color as string | null ?? null,
            brand_from_email: (o as Record<string, unknown>).brand_from_email as string | null ?? null,
            brand_reply_to: (o as Record<string, unknown>).brand_reply_to as string | null ?? null,
            integration_configs: ((o as Record<string, unknown>).integration_configs as Record<string, unknown>) || {},
          }));
          setOrganizations(typedAllOrgs);
          const savedOrgId = localStorage.getItem("currentOrgId");
          const currentOrg = typedAllOrgs.find((o) => o.id === savedOrgId) || typedAllOrgs[0] || null;
          setOrganization(currentOrg);
          if (currentOrg) localStorage.setItem("currentOrgId", currentOrg.id);
          setMembership(null);
        } else {
          setOrganizations([]);
          setOrganization(null);
          setMembership(null);
        }
        return;
      }

      const orgIds = memberships.map((m) => m.organization_id);
      const { data: orgs, error: orgsError } = await supabase
        .from("organizations").select("*").in("id", orgIds);
      if (orgsError) throw orgsError;

      const typedOrgs: Organization[] = (orgs || []).map((o) => ({
        id: o.id, name: o.name, billing_email: o.billing_email,
        plan: o.plan as Organization["plan"], status: o.status as Organization["status"],
        created_at: o.created_at, updated_at: o.updated_at,
        brand_name: (o as Record<string, unknown>).brand_name as string | null ?? null,
        brand_logo_url: (o as Record<string, unknown>).brand_logo_url as string | null ?? null,
        brand_primary_color: (o as Record<string, unknown>).brand_primary_color as string | null ?? null,
        brand_from_email: (o as Record<string, unknown>).brand_from_email as string | null ?? null,
        brand_reply_to: (o as Record<string, unknown>).brand_reply_to as string | null ?? null,
        integration_configs: ((o as Record<string, unknown>).integration_configs as Record<string, unknown>) || {},
      }));

      setOrganizations(typedOrgs);
      const savedOrgId = localStorage.getItem("currentOrgId");
      const currentOrg = typedOrgs.find((o) => o.id === savedOrgId) || typedOrgs[0];

      if (currentOrg) {
        setOrganization(currentOrg);
        localStorage.setItem("currentOrgId", currentOrg.id);
        const currentMembership = memberships.find((m) => m.organization_id === currentOrg.id);
        if (currentMembership) {
          const mem: OrganizationMember = {
            id: currentMembership.id,
            organization_id: currentMembership.organization_id,
            user_id: currentMembership.user_id,
            role: currentMembership.role as OrgRole,
            created_at: currentMembership.created_at,
          };
          setMembership(mem);
          await loadPermissions(userId, currentOrg.id, mem.role);
        }
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
    } finally {
      setIsOrgLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          setTimeout(() => {
            loadOrganizations(currentSession.user.id);
            checkMasterAdmin(currentSession.user.id);
          }, 0);
        } else {
          setOrganizations([]);
          setOrganization(null);
          setMembership(null);
          setIsMasterAdmin(false);
          setPermissions([]);
          setIsOrgLoading(false);
        }
        setIsAuthLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        loadOrganizations(existingSession.user.id);
        checkMasterAdmin(existingSession.user.id);
      } else {
        setIsOrgLoading(false);
      }
      setIsAuthLoading(false);
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  const signUp = async (email: string, password: string, orgName: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email, password, options: { emailRedirectTo: window.location.origin },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("No user returned from signup");

      // If the project requires email confirmation, signUp returns a user but
      // no session. We MUST NOT attempt the org/member insert in that state —
      // RLS would reject it and leave an orphaned auth row with an opaque
      // "permission denied" error. Surface an actionable message instead.
      if (!authData.session) {
        return {
          error: new Error(
            "Check your email to confirm your account, then sign in to finish setup.",
          ),
        };
      }

      const { data: orgData, error: orgError } = await supabase
        .from("organizations").insert({ name: orgName, billing_email: email }).select().single();
      if (orgError) throw orgError;

      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({ organization_id: orgData.id, user_id: authData.user.id, role: "owner" });
      if (memberError) throw memberError;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    setDevMode(false);
    await supabase.auth.signOut();
    localStorage.removeItem("currentOrgId");
    // Clear per-user onboarding scratch state so the next user on this
    // browser doesn't resume into a stranger's concierge step.
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith("fabric59:onboarding:")) localStorage.removeItem(k);
      }
    } catch {
      /* ignore storage errors */
    }
    setOrganization(null);
    setMembership(null);
    setOrganizations([]);
    setIsMasterAdmin(false);
    setPermissions([]);
  };

  const switchOrganization = (orgId: string) => {
    const newOrg = organizations.find((o) => o.id === orgId);
    if (newOrg) {
      setOrganization(newOrg);
      localStorage.setItem("currentOrgId", orgId);
      if (user) {
        supabase
          .from("organization_members")
          .select("*")
          .eq("organization_id", orgId)
          .eq("user_id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              const mem: OrganizationMember = {
                id: data.id, organization_id: data.organization_id,
                user_id: data.user_id, role: data.role as OrgRole, created_at: data.created_at,
              };
              setMembership(mem);
              loadPermissions(user.id, orgId, mem.role);
            } else {
              setMembership(null);
              // Master admin without membership still gets all perms
              if (isMasterAdmin) setPermissions(ALL_PERMISSIONS);
            }
          });
      }
    }
  };

  const effectiveUser = devMode ? DEV_USER : user;
  const effectiveOrg = devMode ? DEV_ORG : organization;
  const effectiveMembership = devMode ? DEV_MEMBERSHIP : membership;
  const effectiveOrgs = devMode ? [DEV_ORG] : organizations;

  const hasPermission = (permission: string): boolean => {
    if (devMode) return true;
    if (isMasterAdmin) return true;
    if (effectiveMembership?.role === "owner" || effectiveMembership?.role === "admin") return true;
    return permissions.includes(permission);
  };

  const value: AuthContextType = {
    user: effectiveUser,
    session,
    organization: effectiveOrg,
    membership: effectiveMembership,
    organizations: effectiveOrgs,
    isLoading: devMode ? false : isAuthLoading || isOrgLoading,
    isAuthenticated: devMode || !!user,
    orgRole: effectiveMembership?.role ?? null,
    workspaceRole: (effectiveMembership?.role ?? null) as WorkspaceRole | null,
    isWorkspaceAdmin: computeIsWorkspaceAdmin(effectiveMembership?.role as WorkspaceRole | null | undefined),
    isMasterAdmin: devMode ? false : isMasterAdmin,
    devMode,
    permissions: devMode ? ALL_PERMISSIONS : permissions,
    hasPermission,
    toggleDevMode,
    signUp,
    signIn,
    signOut,
    switchOrganization,
    refreshOrganizations: async () => {
      if (user) await loadOrganizations(user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
