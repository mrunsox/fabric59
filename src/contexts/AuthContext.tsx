import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Organization, OrganizationMember, OrgRole } from "@/types/database";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  organization: Organization | null;
  membership: OrganizationMember | null;
  organizations: Organization[];
  isLoading: boolean;
  isAuthenticated: boolean;
  orgRole: OrgRole | null;
  isMasterAdmin: boolean;
  signUp: (email: string, password: string, orgName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);

  // Check master admin status
  const checkMasterAdmin = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "master_admin")
        .single();

      setIsMasterAdmin(!!data);
    } catch {
      setIsMasterAdmin(false);
    }
  };

  // Load user's organizations
  const loadOrganizations = async (userId: string) => {
    try {
      // Get memberships
      const { data: memberships, error: membError } = await supabase
        .from("organization_members")
        .select("*")
        .eq("user_id", userId);

      if (membError) throw membError;

      if (!memberships || memberships.length === 0) {
        setOrganizations([]);
        setOrganization(null);
        setMembership(null);
        return;
      }

      // Get organizations
      const orgIds = memberships.map((m) => m.organization_id);
      const { data: orgs, error: orgsError } = await supabase
        .from("organizations")
        .select("*")
        .in("id", orgIds);

      if (orgsError) throw orgsError;

      const typedOrgs: Organization[] = (orgs || []).map((o) => ({
        id: o.id,
        name: o.name,
        billing_email: o.billing_email,
        plan: o.plan as Organization["plan"],
        status: o.status as Organization["status"],
        created_at: o.created_at,
        updated_at: o.updated_at,
      }));

      setOrganizations(typedOrgs);

      // Set current org (from localStorage or first one)
      const savedOrgId = localStorage.getItem("currentOrgId");
      const currentOrg = typedOrgs.find((o) => o.id === savedOrgId) || typedOrgs[0];
      
      if (currentOrg) {
        setOrganization(currentOrg);
        localStorage.setItem("currentOrgId", currentOrg.id);
        
        // Find the membership for this org
        const currentMembership = memberships.find((m) => m.organization_id === currentOrg.id);
        if (currentMembership) {
          setMembership({
            id: currentMembership.id,
            organization_id: currentMembership.organization_id,
            user_id: currentMembership.user_id,
            role: currentMembership.role as OrgRole,
            created_at: currentMembership.created_at,
          });
        }
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Defer organization loading to avoid auth deadlock
          setTimeout(() => {
            loadOrganizations(currentSession.user.id);
            checkMasterAdmin(currentSession.user.id);
          }, 0);
        } else {
          setOrganizations([]);
          setOrganization(null);
          setMembership(null);
          setIsMasterAdmin(false);
        }

        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        loadOrganizations(existingSession.user.id);
        checkMasterAdmin(existingSession.user.id);
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, orgName: string) => {
    try {
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user returned from signup");

      // 2. Create organization
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({ name: orgName, billing_email: email })
        .select()
        .single();

      if (orgError) throw orgError;

      // 3. Add user as owner
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: orgData.id,
          user_id: authData.user.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("currentOrgId");
    setOrganization(null);
    setMembership(null);
    setOrganizations([]);
    setIsMasterAdmin(false);
  };

  const switchOrganization = (orgId: string) => {
    const newOrg = organizations.find((o) => o.id === orgId);
    if (newOrg) {
      setOrganization(newOrg);
      localStorage.setItem("currentOrgId", orgId);
      
      // Update membership
      if (user) {
        supabase
          .from("organization_members")
          .select("*")
          .eq("organization_id", orgId)
          .eq("user_id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setMembership({
                id: data.id,
                organization_id: data.organization_id,
                user_id: data.user_id,
                role: data.role as OrgRole,
                created_at: data.created_at,
              });
            }
          });
      }
    }
  };

  const value: AuthContextType = {
    user,
    session,
    organization,
    membership,
    organizations,
    isLoading,
    isAuthenticated: !!user,
    orgRole: membership?.role ?? null,
    isMasterAdmin,
    signUp,
    signIn,
    signOut,
    switchOrganization,
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
