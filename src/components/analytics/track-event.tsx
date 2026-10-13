"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

/** Fires one analytics event when mounted. Renders nothing. */
export function TrackEvent({
  event,
  props,
}: {
  event: AnalyticsEvent;
  props?: Record<string, string | number | boolean>;
}) {
  const serialized = props ? JSON.stringify(props) : "";
  useEffect(() => {
    track(event, serialized ? (JSON.parse(serialized) as Record<string, string | number | boolean>) : undefined);
  }, [event, serialized]);
  return null;
}
