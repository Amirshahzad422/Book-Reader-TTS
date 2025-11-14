import { useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export function useSupportRealtime(
  userId: string,
  onNewMessage: (message: any) => void,
  onTicketUpdate: (ticket: any) => void
) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!userId || !supabase) return;

    // Create a channel for real-time updates
    const channel = supabase.channel("support_realtime");

    // Subscribe to new messages
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
        },
        (payload) => {
          onNewMessage(payload.new);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_tickets",
        },
        (payload) => {
          onTicketUpdate(payload.new);
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, onNewMessage, onTicketUpdate]);
}
