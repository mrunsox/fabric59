import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/slack/api";

async function slackGet(path: string, lovableKey: string, slackKey: string) {
  const res = await fetch(`${GATEWAY_URL}/${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": slackKey,
    },
  });
  return res.json();
}

async function slackPost(
  endpoint: string,
  body: Record<string, unknown>,
  lovableKey: string,
  slackKey: string,
) {
  const res = await fetch(`${GATEWAY_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": slackKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

/** Build a name→id map for all public channels */
async function buildChannelMap(
  lovableKey: string,
  slackKey: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let cursor: string | undefined;
  do {
    const params = new URLSearchParams({
      types: "public_channel",
      limit: "200",
      exclude_archived: "true",
      ...(cursor ? { cursor } : {}),
    });
    const data = await slackGet(
      `conversations.list?${params}`,
      lovableKey,
      slackKey,
    );
    if (!data.ok) break;
    for (const ch of data.channels ?? []) {
      map.set(`#${ch.name}`, ch.id);
      map.set(ch.name, ch.id);
    }
    cursor = data.response_metadata?.next_cursor || undefined;
  } while (cursor);
  return map;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "LOVABLE_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const SLACK_API_KEY = Deno.env.get("SLACK_API_KEY");
  if (!SLACK_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "SLACK_API_KEY is not configured — Slack connector not linked" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const { action, email, agentName, channels, slackUserId: providedSlackUserId } = await req.json();

    // ─── TEST ────────────────────────────────────────────────────────────────
    if (action === "test") {
      const data = await slackGet("auth.test", LOVABLE_API_KEY, SLACK_API_KEY);
      if (data.ok) {
        return new Response(
          JSON.stringify({
            success: true,
            workspace: data.team,
            botName: data.bot_id ? data.user : data.user,
            userId: data.user_id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: data.error || "auth.test failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── INVITE USER (onboarding) ─────────────────────────────────────────────
    if (action === "inviteUser") {
      if (!email) {
        return new Response(
          JSON.stringify({ success: false, error: "email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Look up user by email
      const lookupParams = new URLSearchParams({ email });
      const lookupData = await slackGet(
        `users.lookupByEmail?${lookupParams}`,
        LOVABLE_API_KEY,
        SLACK_API_KEY,
      );

      if (!lookupData.ok) {
        // User not in Slack — post a notification to #all-agents
        const channelMap = await buildChannelMap(LOVABLE_API_KEY, SLACK_API_KEY);
        const fallbackChannelId = channelMap.get("#all-agents") || channelMap.get("all-agents");

        if (fallbackChannelId) {
          await slackPost(
            "chat.postMessage",
            {
              channel: fallbackChannelId,
              text: `👋 New agent onboarded: *${agentName || email}* (${email}) — please send them a Slack workspace invitation.`,
            },
            LOVABLE_API_KEY,
            SLACK_API_KEY,
          );
        }

        return new Response(
          JSON.stringify({
            success: false,
            notFound: true,
            error: `Agent ${email} not found in Slack workspace. A notification was posted to #all-agents.`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const slackUserId = lookupData.user?.id;

      // Build channel name → ID map
      const channelMap = await buildChannelMap(LOVABLE_API_KEY, SLACK_API_KEY);

      const inviteResults: Array<{ channel: string; ok: boolean; error?: string }> = [];

      for (const channelName of (channels ?? [])) {
        const channelId = channelMap.get(channelName) || channelMap.get(channelName.replace(/^#/, ""));
        if (!channelId) {
          inviteResults.push({ channel: channelName, ok: false, error: "channel not found" });
          continue;
        }
        const inviteData = await slackPost(
          "conversations.invite",
          { channel: channelId, users: slackUserId },
          LOVABLE_API_KEY,
          SLACK_API_KEY,
        );
        inviteResults.push({
          channel: channelName,
          ok: inviteData.ok || inviteData.error === "already_in_channel",
          error: inviteData.error,
        });
      }

      const allOk = inviteResults.every((r) => r.ok);

      return new Response(
        JSON.stringify({
          success: allOk,
          slackUserId,
          inviteResults,
          error: allOk ? undefined : `Some channel invites failed: ${inviteResults.filter(r => !r.ok).map(r => `${r.channel}: ${r.error}`).join(", ")}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── REMOVE USER (offboarding) ────────────────────────────────────────────
    if (action === "removeUser") {
      if (!email && !providedSlackUserId) {
        return new Response(
          JSON.stringify({ success: false, error: "email or slackUserId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      let slackUserId = providedSlackUserId;

      // If no cached slackUserId, look up by email
      if (!slackUserId && email) {
        const lookupParams = new URLSearchParams({ email });
        const lookupData = await slackGet(
          `users.lookupByEmail?${lookupParams}`,
          LOVABLE_API_KEY,
          SLACK_API_KEY,
        );

        if (!lookupData.ok) {
          // User not found in Slack — treat as skipped (not an error)
          return new Response(
            JSON.stringify({ success: true, skipped: true, reason: "User not found in Slack workspace" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        slackUserId = lookupData.user?.id;
      }

      // Get all channels the user is in
      const convoParams = new URLSearchParams({ user: slackUserId, types: "public_channel,private_channel", limit: "200" });
      const convoData = await slackGet(
        `users.conversations?${convoParams}`,
        LOVABLE_API_KEY,
        SLACK_API_KEY,
      );

      const kickResults: Array<{ channel: string; ok: boolean; error?: string }> = [];

      if (convoData.ok && convoData.channels?.length) {
        for (const ch of convoData.channels) {
          const kickData = await slackPost(
            "conversations.kick",
            { channel: ch.id, user: slackUserId },
            LOVABLE_API_KEY,
            SLACK_API_KEY,
          );
          kickResults.push({
            channel: ch.name || ch.id,
            ok: kickData.ok || kickData.error === "not_in_channel",
            error: kickData.error,
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, slackUserId, kickResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("slack-agent error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
