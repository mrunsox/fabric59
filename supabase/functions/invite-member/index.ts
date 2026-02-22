import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const { email, role, organizationId } = await req.json();

    if (!email || !organizationId) {
      return new Response(JSON.stringify({ error: "email and organizationId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const memberRole = role === "admin" ? "admin" : "member";

    // Service-role client for admin operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is org admin/owner
    const { data: callerMembership } = await adminClient
      .from("organization_members")
      .select("role")
      .eq("user_id", callerId)
      .eq("organization_id", organizationId)
      .single();

    if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
      return new Response(JSON.stringify({ error: "You must be an org admin to invite members" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Invite user by email (creates user + sends magic link)
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email);

    if (inviteError) {
      // If user already exists, try to look them up
      if (inviteError.message?.includes("already been registered") || inviteError.status === 422) {
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existingUser = listData?.users?.find((u: { email?: string }) => u.email === email);
        if (existingUser) {
          // Check if already a member
          const { data: existing } = await adminClient
            .from("organization_members")
            .select("id")
            .eq("user_id", existingUser.id)
            .eq("organization_id", organizationId)
            .maybeSingle();

          if (existing) {
            return new Response(JSON.stringify({ error: "User is already a member of this organization" }), {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Add existing user to org
          const { error: memberError } = await adminClient
            .from("organization_members")
            .insert({ user_id: existingUser.id, organization_id: organizationId, role: memberRole });

          if (memberError) throw memberError;

          return new Response(JSON.stringify({ success: true, message: "Existing user added to organization" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      throw inviteError;
    }

    const newUserId = inviteData.user.id;

    // Add new user to organization
    const { error: memberError } = await adminClient
      .from("organization_members")
      .insert({ user_id: newUserId, organization_id: organizationId, role: memberRole });

    if (memberError) throw memberError;

    return new Response(JSON.stringify({ success: true, message: "Invitation sent successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("invite-member error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
