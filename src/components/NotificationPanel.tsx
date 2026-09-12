import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

interface Notif {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: "post" | "request_accepted" | "request_rejected" | "new_request";
}

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ICON: Record<Notif["type"], { bg: string; color: string; emoji: string }> = {
  post:              { bg: "var(--green-bg)",  color: "var(--green)",  emoji: "📢" },
  request_accepted:  { bg: "var(--green-bg)",  color: "var(--green)",  emoji: "✅" },
  request_rejected:  { bg: "#FEF2F2",          color: "#DC2626",       emoji: "❌" },
  new_request:       { bg: "var(--purple-bg)", color: "var(--purple)", emoji: "📋" },
};

interface Props {
  open: boolean;
  onClose: () => void;
  role: "student" | "teacher";
  userId: string;
  branch?: string;
  onUnreadCount: (n: number) => void;
}

export default function NotificationPanel({ open, onClose, role, userId, branch, onUnreadCount }: Props) {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSeenKey = `notif_seen_${userId}`;

  function getLastSeen(): string {
    return localStorage.getItem(lastSeenKey) ?? new Date(Date.now() - 7 * 86400 * 1000).toISOString();
  }

  async function loadNotifs() {
    const lastSeen = getLastSeen();
    const items: Notif[] = [];

    if (role === "student") {
      // New posts
      const { data: posts } = await supabase
        .from("posts")
        .select("id, author_name, content, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      posts?.forEach(p => {
        items.push({
          id: `post-${p.id}`,
          title: `New post from ${p.author_name}`,
          body: (p.content as string).slice(0, 80) + ((p.content as string).length > 80 ? "…" : ""),
          time: p.created_at,
          read: new Date(p.created_at) <= new Date(lastSeen),
          type: "post",
        });
      });

      // Request status changes
      const { data: reqs } = await supabase
        .from("requests")
        .select("id, request_type, status, accepted_by_name, created_at")
        .eq("student_id", userId)
        .in("status", ["accepted", "rejected"])
        .order("created_at", { ascending: false })
        .limit(10);

      reqs?.forEach(r => {
        items.push({
          id: `req-${r.id}`,
          title: r.status === "accepted" ? "Request Accepted" : "Request Rejected",
          body: r.status === "accepted"
            ? `Your ${r.request_type} was accepted by ${r.accepted_by_name}`
            : `Your ${r.request_type} was not approved`,
          time: r.created_at,
          read: new Date(r.created_at) <= new Date(lastSeen),
          type: r.status === "accepted" ? "request_accepted" : "request_rejected",
        });
      });

    } else {
      // Faculty: new pending requests for branch
      if (branch) {
        const { data: reqs } = await supabase
          .from("requests")
          .select("id, student_name, request_type, created_at")
          .eq("branch", branch)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(15);

        reqs?.forEach(r => {
          items.push({
            id: `req-${r.id}`,
            title: `New request from ${r.student_name}`,
            body: r.request_type,
            time: r.created_at,
            read: new Date(r.created_at) <= new Date(lastSeen),
            type: "new_request",
          });
        });
      }
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setNotifs(items);
    onUnreadCount(items.filter(n => !n.read).length);
    setLoading(false);
  }

  useEffect(() => {
    if (!userId) return;
    loadNotifs();

    // Real-time
    const tables = role === "student"
      ? [{ table: "posts" }, { table: "requests", filter: `student_id=eq.${userId}` }]
      : [{ table: "requests", filter: branch ? `branch=eq.${branch}` : undefined }];

    const ch = supabase.channel(`notif-${userId}`);
    tables.forEach(({ table, filter }) => {
      ch.on("postgres_changes" as Parameters<typeof ch.on>[0], {
        event: "*", schema: "public", table,
        ...(filter ? { filter } : {}),
      } as Parameters<typeof ch.on>[1], () => loadNotifs());
    });
    ch.subscribe();
    channelRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, [userId, branch, role]);

  function markAllRead() {
    localStorage.setItem(lastSeenKey, new Date().toISOString());
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    onUnreadCount(0);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-white flex flex-col shadow-2xl"
        style={{ animation: "slideInRight 0.22s ease" }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="font-bold text-base" style={{ color: "var(--slate)" }}>Notifications</h2>
            {notifs.filter(n => !n.read).length > 0 && (
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                {notifs.filter(n => !n.read).length} unread
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notifs.some(n => !n.read) && (
              <button onClick={markAllRead} className="text-xs font-medium px-3 py-1.5 rounded-lg"
                style={{ background: "var(--green-bg)", color: "var(--green)" }}>
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100"
              style={{ color: "var(--slate)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm" style={{ color: "var(--muted)" }}>
              Loading…
            </div>
          ) : notifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="text-4xl">🔔</div>
              <p className="text-sm font-medium" style={{ color: "var(--slate)" }}>All caught up!</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {notifs.map(n => {
                const ic = ICON[n.type];
                return (
                  <div key={n.id}
                    className="flex items-start gap-3 px-4 py-3.5 transition-colors"
                    style={{ background: n.read ? "#fff" : "var(--green-bg)" }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: ic.bg }}>
                      {ic.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug" style={{ color: "var(--slate)" }}>{n.title}</p>
                        {!n.read && (
                          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: "var(--green)" }} />
                        )}
                      </div>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--muted)" }}>{n.body}</p>
                      <p className="text-xs mt-1 font-medium" style={{ color: ic.color }}>{timeAgo(n.time)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
