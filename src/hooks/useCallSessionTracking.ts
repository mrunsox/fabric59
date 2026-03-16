import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TrackingEvent {
  node_id: string;
  node_type: string;
  node_label?: string;
  event_type: "navigate" | "start" | "end" | "skip" | "back";
  metadata?: Record<string, unknown>;
}

export function useCallSessionTracking(options: { scriptId?: string; callSessionId?: string; enabled?: boolean } = {}) {
  const { callSessionId, enabled = true } = options;
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const startTimeRef = useRef<Date | null>(null);
  const lastNodeTimeRef = useRef<Date | null>(null);

  const startTracking = useCallback(() => { if (!enabled) return; setIsTracking(true); startTimeRef.current = new Date(); lastNodeTimeRef.current = new Date(); setEvents([]); }, [enabled]);
  const stopTracking = useCallback(() => { setIsTracking(false); startTimeRef.current = null; lastNodeTimeRef.current = null; }, []);

  const trackEvent = useCallback(async (event: TrackingEvent) => {
    if (!enabled || !isTracking) return;
    const now = new Date();
    const timeOnPrev = lastNodeTimeRef.current ? now.getTime() - lastNodeTimeRef.current.getTime() : 0;
    lastNodeTimeRef.current = now;
    const enriched = { ...event, metadata: { ...event.metadata, time_on_previous_node_ms: timeOnPrev, timestamp: now.toISOString(), total_elapsed_ms: startTimeRef.current ? now.getTime() - startTimeRef.current.getTime() : 0 } };
    setEvents((prev) => [...prev, enriched]);
    if (callSessionId) {
      try {
        await supabase.from("call_session_events").insert({ call_session_id: callSessionId, node_id: event.node_id, event_type: event.event_type, data: enriched.metadata as any });
      } catch (err) { console.error("Failed to track event:", err); }
    }
  }, [enabled, isTracking, callSessionId]);

  const trackNodeVisit = useCallback((nodeId: string, nodeType: string, nodeLabel?: string) => { trackEvent({ node_id: nodeId, node_type: nodeType, node_label: nodeLabel, event_type: "navigate" }); }, [trackEvent]);
  const trackCallStart = useCallback((nodeId: string, nodeType: string, nodeLabel?: string) => { trackEvent({ node_id: nodeId, node_type: nodeType, node_label: nodeLabel, event_type: "start" }); }, [trackEvent]);
  const trackCallEnd = useCallback((nodeId: string, nodeType: string, nodeLabel?: string) => { trackEvent({ node_id: nodeId, node_type: nodeType, node_label: nodeLabel, event_type: "end", metadata: { total_nodes_visited: events.length + 1, total_duration_ms: startTimeRef.current ? new Date().getTime() - startTimeRef.current.getTime() : 0 } }); }, [trackEvent, events.length]);
  const trackBack = useCallback((nodeId: string, nodeType: string, nodeLabel?: string) => { trackEvent({ node_id: nodeId, node_type: nodeType, node_label: nodeLabel, event_type: "back" }); }, [trackEvent]);

  const getAnalyticsSummary = useCallback(() => {
    const totalDuration = startTimeRef.current ? new Date().getTime() - startTimeRef.current.getTime() : 0;
    const nodeVisits = events.filter((e) => e.event_type === "navigate" || e.event_type === "start");
    const backEvents = events.filter((e) => e.event_type === "back");
    return { totalNodesVisited: nodeVisits.length, totalDurationMs: totalDuration, backNavigations: backEvents.length, events };
  }, [events]);

  return { events, isTracking, startTracking, stopTracking, trackNodeVisit, trackCallStart, trackCallEnd, trackBack, getAnalyticsSummary };
}
