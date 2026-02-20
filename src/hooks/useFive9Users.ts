import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Five9User {
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  extension: string;
  active: boolean;
  inferredRole: string;
}

function inferRole(extension: string): string {
  const ext = parseInt(extension, 10);
  if (isNaN(ext)) return 'Unknown';
  if (ext >= 0 && ext <= 99) return 'Manager';
  if (ext >= 1000 && ext <= 1100) return 'English Support';
  if (ext >= 2000 && ext <= 2100) return 'French Support';
  if (ext >= 3000 && ext <= 3100) return 'Spanish Support';
  if (ext >= 4000 && ext <= 4100) return 'Trilingual Support';
  if (ext >= 5000 && ext <= 5100) return 'Supervisor';
  if (ext >= 6000 && ext <= 6100) return 'QA Specialist';
  if (ext >= 7000 && ext <= 7100) return 'Tech Support';
  return 'Agent';
}

export function useFive9Users() {
  const [users, setUsers] = useState<Five9User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('five9-provisioning', {
        body: { action: 'getAllUsers' },
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch users');

      const mapped: Five9User[] = (data.users || []).map((u: Record<string, unknown>) => ({
        firstName: String(u.firstName || ''),
        lastName: String(u.lastName || ''),
        email: String(u.email || ''),
        userName: String(u.userName || ''),
        extension: String(u.extension || '').padStart(4, '0'),
        active: Boolean(u.active),
        inferredRole: inferRole(String(u.extension || '')),
      }));

      // Sort by extension numerically, then by last name
      mapped.sort((a, b) => {
        const extA = parseInt(a.extension, 10);
        const extB = parseInt(b.extension, 10);
        if (extA !== extB) return extA - extB;
        return a.lastName.localeCompare(b.lastName);
      });

      setUsers(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  return { users, loading, error, fetchUsers };
}
