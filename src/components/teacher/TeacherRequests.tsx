import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

interface DBRequest {
  id: string;
  student_name: string;
  roll_number: string;
  branch: string;
  request_type: string;
  reason: string;
  description: string | null;
  from_date: string;
  to_date: string | null;
  status: string;
  accepted_by: string | null;
  accepted_by_name: string | null;
  created_at: string;
}

type Filter = "pending" | "accepted" | "rejected";

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

const AVATAR_COLORS = ["#7C3AED","#16A34A","#F97316","#0EA5E9","#DB2777"];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

export default function TeacherRequests() {
  const [requests, setRequests] = useState<DBRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [detail, setDetail] = useState<DBRequest | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [branch, setBranch] = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const m = user.user_metadata ?? {};
      const b = m.branch ?? "";
      const name = m.full_name ?? user.email?.split("@")[0] ?? "Faculty";
      setBranch(b);
      setFacultyName(name);
      setFacultyId(user.id);

      if (!b) { setLoading(false); return; }

      const { data } = await supabase
        .from("requests")
        .select("*")
        .eq("branch", b)
        .order("created_at", { ascending: false });
      setRequests((data as DBRequest[]) ?? []);
      setLoading(false);

      // Real-time: watch all requests for this branch
      channelRef.current = supabase
        .channel(`teacher-requests-${b}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "requests",
          filter: `branch=eq.${b}`,
        }, (payload) => {
          if (payload.eventType === "INSERT") {
            setRequests(prev => [payload.new as DBRequest, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as DBRequest;
            setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
            setDetail(prev => prev?.id === updated.id ? updated : prev);
          }
        })
        .subscribe();
    }
    init();
    return () => { channelRef.current?.unsubscribe(); };
  }, []);

  async function acceptRequest(req: DBRequest) {
    setAccepting(req.id);
    await supabase.from("requests").update({
      status: "accepted",
      accepted_by: facultyId,
      accepted_by_name: facultyName,
    }).eq("id", req.id);
    setAccepting(null);
  }

  async function rejectRequest(req: DBRequest) {
    setAccepting(req.id);
    await supabase.from("requests").update({ status: "rejected" }).eq("id", req.id);
    setAccepting(null);
  }

  const visible = requests.filter(r => r.status === filter);
  const counts = {
    pending: requests.filter(r => r.status === "pending").length,
    accepted: requests.filter(r => r.status === "accepted").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  };

  // ── DETAIL VIEW ───────────────────────────────────────────────
  if (detail) {
    const isMine = detail.accepted_by === facultyId;
    const isActing = accepting === detail.id;
    return (
      <div className="bg-white min-h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <button onClick={() => setDetail(null)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-50" style={{ color: "var(--slate)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <h2 className="font-bold text-base" style={{ color: "var(--slate)" }}>Request Details</h2>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ background: avatarColor(detail.student_name) }}>
              {initials(detail.student_name)}
            </div>
            <div>
              <div className="font-bold" style={{ color: "var(--slate)" }}>{detail.student_name}</div>
              <div className="text-sm" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                {detail.roll_number} · {detail.branch}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border divide-y" style={{ borderColor: "var(--border)" }}>
            {[
              { l: "Request Type", v: detail.request_type },
              { l: "Reason", v: detail.reason },
              { l: "From", v: detail.from_date },
              ...(detail.to_date ? [{ l: "To", v: detail.to_date }] : []),
              { l: "Submitted", v: timeAgo(detail.created_at) },
            ].map((row, i) => (
              <div key={i} className="flex justify-between px-4 py-3 text-sm">
                <span style={{ color: "var(--muted)" }}>{row.l}</span>
                <span className="font-medium" style={{ color: "var(--slate)" }}>{row.v}</span>
              </div>
            ))}
          </div>

          {detail.description && (
            <div>
              <div className="text-sm font-semibold mb-1.5" style={{ color: "var(--slate)" }}>Description</div>
              <div className="rounded-xl p-3 text-sm" style={{ background: "var(--surface)", color: "var(--muted)" }}>
                {detail.description}
              </div>
            </div>
          )}

          {/* Status / actions */}
          {detail.status === "pending" ? (
            <div className="flex gap-3 pt-2">
              <button onClick={() => acceptRequest(detail)} disabled={!!isActing}
                className="flex-1 py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--green)" }}>
                {isActing ? "Accepting…" : "Accept"}
              </button>
              <button onClick={() => rejectRequest(detail)} disabled={!!isActing}
                className="flex-1 py-3.5 rounded-2xl font-semibold disabled:opacity-50"
                style={{ background: "#FEF2F2", color: "var(--red)" }}>
                Reject
              </button>
            </div>
          ) : detail.status === "accepted" ? (
            <div className="rounded-2xl p-4 text-center" style={{ background: "var(--green-bg)" }}>
              <p className="text-sm font-bold" style={{ color: "var(--green)" }}>
                ✅ Accepted by {isMine ? "you" : detail.accepted_by_name}
              </p>
              {!isMine && (
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  No action needed — already handled.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl p-4 text-center" style={{ background: "#FEF2F2" }}>
              <p className="text-sm font-bold" style={{ color: "var(--red)" }}>Rejected</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────
  return (
    <div className="bg-white min-h-full">
      <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <div>
          <h2 className="font-bold text-base" style={{ color: "var(--slate)" }}>Student Requests</h2>
          {branch && (
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Showing requests for <strong>{branch}</strong> branch</p>
          )}
        </div>
        {counts.pending > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: "var(--red)" }}>
            {counts.pending} new
          </span>
        )}
      </div>

      {!branch && !loading && (
        <div className="p-8 text-center">
          <p className="text-sm" style={{ color: "var(--muted)" }}>No branch assigned to your account. Contact admin.</p>
        </div>
      )}

      {branch && (
        <>
          <div className="flex border-b px-4 gap-1" style={{ borderColor: "var(--border)" }}>
            {(["pending", "accepted", "rejected"] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors capitalize"
                style={{ color: filter === f ? "var(--green)" : "var(--muted)", borderBottomColor: filter === f ? "var(--green)" : "transparent" }}>
                {f}
                {counts[f] > 0 && (
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                    style={filter === f ? { background: "var(--green-bg)", color: "var(--green)" } : { background: "#F1F5F9", color: "var(--muted)" }}>
                    {counts[f]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>Loading…</div>
          ) : visible.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>No {filter} requests</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {visible.map(req => {
                const isActing = accepting === req.id;
                const alreadyAcceptedByOther = req.status === "accepted" && req.accepted_by !== facultyId;
                return (
                  <div key={req.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: avatarColor(req.student_name) }}>
                        {initials(req.student_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-sm" style={{ color: "var(--slate)" }}>{req.student_name}</span>
                          <span className="text-xs flex-shrink-0" style={{ color: "var(--muted)" }}>{timeAgo(req.created_at)}</span>
                        </div>
                        <div className="text-xs mt-0.5 font-medium" style={{ color: "var(--muted)" }}>{req.request_type} · {req.reason}</div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {req.from_date}{req.to_date ? ` – ${req.to_date}` : ""}
                        </div>

                        {/* Accepted-by-other banner */}
                        {alreadyAcceptedByOther && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                            style={{ background: "var(--green-bg)", color: "var(--green)" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Accepted by {req.accepted_by_name}
                          </div>
                        )}

                        {/* Accepted by me */}
                        {req.status === "accepted" && req.accepted_by === facultyId && (
                          <div className="mt-2 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                            style={{ background: "var(--green-bg)", color: "var(--green)" }}>
                            ✅ Accepted by you
                          </div>
                        )}
                      </div>
                    </div>

                    {req.status === "pending" && (
                      <div className="flex gap-2 mt-3 pl-13">
                        <button onClick={() => acceptRequest(req)} disabled={isActing}
                          className="px-5 py-2 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                          style={{ background: "var(--green)" }}>
                          {isActing ? "…" : "Accept"}
                        </button>
                        <button onClick={() => rejectRequest(req)} disabled={isActing}
                          className="px-5 py-2 rounded-xl font-semibold text-sm disabled:opacity-50"
                          style={{ background: "#FEF2F2", color: "var(--red)" }}>
                          Reject
                        </button>
                        <button onClick={() => setDetail(req)} className="ml-auto px-3 py-2 rounded-xl text-sm border hover:bg-slate-50"
                          style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
                          Details
                        </button>
                      </div>
                    )}
                    {req.status !== "pending" && (
                      <button onClick={() => setDetail(req)} className="mt-2 text-xs font-medium pl-13" style={{ color: "var(--green)" }}>
                        View details →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
