import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { findStudentByEmail } from "../../lib/studentLookup";

type Step = "list" | "form" | "success";

interface RequestType {
  id: string;
  label: string;
  desc: string;
  icon: string;
  iconBg: string;
}

const REQUEST_TYPES: RequestType[] = [
  { id: "leave", label: "Leave Request", desc: "Apply for leave from classes.", icon: "📋", iconBg: "#F0FDF4" },
  { id: "meet-hod", label: "Meet HOD", desc: "Request an appointment with HOD.", icon: "👤", iconBg: "#F5F3FF" },
  { id: "meet-principal", label: "Meet Principal", desc: "Request an appointment with Principal.", icon: "🏫", iconBg: "#EFF6FF" },
  { id: "certificate", label: "Certificate Request", desc: "Bonafide, Course, etc.", icon: "📄", iconBg: "#FFFBEB" },
  { id: "permission", label: "Permission Request", desc: "On-duty, event, travel, etc.", icon: "🔓", iconBg: "#FFF1F2" },
];

const REASON_OPTIONS: Record<string, string[]> = {
  leave: ["Medical", "Family Function", "Personal", "Travel", "Other"],
  "meet-hod": ["Academic Guidance", "Complaint", "Feedback", "Other"],
  "meet-principal": ["Academic Issue", "Disciplinary", "Scholarship", "Other"],
  certificate: ["Bonafide Certificate", "Course Completion", "Character Certificate", "Other"],
  permission: ["On-Duty", "Sports Event", "Cultural Event", "Travel", "Other"],
};

interface DBRequest {
  id: string;
  request_type: string;
  reason: string;
  from_date: string;
  to_date: string | null;
  status: string;
  accepted_by_name: string | null;
  created_at: string;
  branch: string;
}

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function StudentRequests() {
  const [step, setStep] = useState<Step>("list");
  const [selected, setSelected] = useState<RequestType | null>(null);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<DBRequest | null>(null);

  const [myRequests, setMyRequests] = useState<DBRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [userId, setUserId] = useState("");

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const row = await findStudentByEmail(user.email ?? "", "\"Name of Student\", \"Rollnumber\", \"Department\"");
      if (row) {
        setStudentName(row["Name of Student"] ?? "");
        setRollNumber(row["Rollnumber"] ?? "");
        // Map department to branch code
        const dept = (row["Department"] ?? "") as string;
        const b = dept.includes("Data") ? "CSD" : dept.includes("Machine") || dept.includes("AI") ? "CSM" : "CSE";
        setBranch(b);
      }

      const { data } = await supabase
        .from("requests")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      setMyRequests((data as DBRequest[]) ?? []);
      setLoadingHistory(false);

      // Real-time: watch own requests for status changes
      channelRef.current = supabase
        .channel(`student-requests-${user.id}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "requests",
          filter: `student_id=eq.${user.id}`,
        }, (payload) => {
          if (payload.eventType === "INSERT") {
            setMyRequests(prev => [payload.new as DBRequest, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setMyRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new as DBRequest : r));
          }
        })
        .subscribe();
    }
    init();
    return () => { channelRef.current?.unsubscribe(); };
  }, []);

  const handleSelect = (rt: RequestType) => {
    setSelected(rt);
    setReason(""); setDescription(""); setFromDate(""); setToDate("");
    setSubmitError(null);
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setSubmitError(null);

    const { data, error } = await supabase.from("requests").insert({
      student_id: userId,
      student_name: studentName,
      roll_number: rollNumber,
      branch,
      request_type: selected.label,
      reason,
      description,
      from_date: fromDate,
      to_date: toDate || null,
      status: "pending",
    }).select().single();

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }
    setLastSubmitted(data as DBRequest);
    setSubmitting(false);
    setStep("success");
  };

  const handleReset = () => {
    setStep("list");
    setSelected(null);
  };

  // ── SUCCESS ─────────────────────────────────────────────────
  if (step === "success" && selected && lastSubmitted) {
    return (
      <div className="min-h-full bg-white p-4 flex flex-col items-center justify-center text-center space-y-5 pt-12">
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "var(--green-bg)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--green)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--slate)" }}>Request Submitted!</h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Sent to all <strong>{branch}</strong> faculty. You will be notified when it is accepted.
          </p>
        </div>

        <div className="w-full max-w-xs rounded-2xl border p-4 text-left space-y-2.5" style={{ borderColor: "var(--border)" }}>
          {[
            { l: "Request ID", v: lastSubmitted.id.slice(0, 8).toUpperCase(), mono: true },
            { l: "Type", v: selected.label },
            { l: "Branch", v: branch },
            { l: "From", v: fromDate || "—" },
            ...(toDate ? [{ l: "To", v: toDate }] : []),
          ].map((row, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span style={{ color: "var(--muted)" }}>{row.l}</span>
              <span className="font-medium" style={{ color: "var(--slate)", fontFamily: (row as { mono?: boolean }).mono ? "'JetBrains Mono', monospace" : undefined }}>{row.v}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm items-center">
            <span style={{ color: "var(--muted)" }}>Status</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#FFF7ED", color: "#C2410C" }}>Pending</span>
          </div>
        </div>

        <button onClick={handleReset} className="w-full max-w-xs py-3 rounded-2xl font-semibold text-white" style={{ background: "var(--green)" }}>
          View My Requests
        </button>
      </div>
    );
  }

  // ── FORM ─────────────────────────────────────────────────────
  if (step === "form" && selected) {
    return (
      <div className="bg-white min-h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <button onClick={() => setStep("list")} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-50" style={{ color: "var(--slate)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <h2 className="font-bold text-base" style={{ color: "var(--slate)" }}>{selected.label}</h2>
        </div>

        {branch && (
          <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: "var(--green-bg)", color: "var(--green)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/></svg>
            Sending to all <strong>{branch}</strong> faculty
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--slate)" }}>Reason</label>
            <div className="relative">
              <select value={reason} onChange={e => setReason(e.target.value)} required
                className="w-full border rounded-xl px-3 py-3 text-sm appearance-none pr-10 focus:outline-none"
                style={{ borderColor: "var(--border)", color: reason ? "var(--slate)" : "var(--muted)" }}>
                <option value="">Select reason…</option>
                {(REASON_OPTIONS[selected.id] ?? []).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted)" }}>
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--slate)" }}>Description</label>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe your request…"
              className="w-full border rounded-xl px-3 py-3 text-sm resize-none focus:outline-none"
              style={{ borderColor: "var(--border)", color: "var(--slate)" }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--slate)" }}>From Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} required
                className="w-full border rounded-xl px-3 py-3 text-sm focus:outline-none"
                style={{ borderColor: "var(--border)", color: "var(--slate)" }} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--slate)" }}>To Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="w-full border rounded-xl px-3 py-3 text-sm focus:outline-none"
                style={{ borderColor: "var(--border)", color: "var(--slate)" }} />
            </div>
          </div>

          {submitError && (
            <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "#FEF2F2", color: "#DC2626" }}>{submitError}</div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--green)" }}>
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </form>
      </div>
    );
  }

  // ── LIST ──────────────────────────────────────────────────────
  return (
    <div className="bg-white min-h-full p-4">
      <h2 className="text-lg font-bold mb-1" style={{ color: "var(--slate)" }}>New Request</h2>
      <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>Select the type of request to raise.</p>

      <div className="space-y-3 mb-8">
        {REQUEST_TYPES.map(rt => (
          <button key={rt.id} onClick={() => handleSelect(rt)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all hover:shadow-sm hover:border-green-300"
            style={{ borderColor: "var(--border)", background: "#fff" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: rt.iconBg }}>
              {rt.icon}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm" style={{ color: "var(--slate)" }}>{rt.label}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{rt.desc}</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: "var(--muted)" }}>
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        ))}
      </div>

      <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--slate)" }}>My Requests</h3>
      {loadingHistory ? (
        <p className="text-xs text-center py-6" style={{ color: "var(--muted)" }}>Loading…</p>
      ) : myRequests.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: "var(--muted)" }}>No requests yet.</p>
      ) : (
        <div className="space-y-2">
          {myRequests.map(r => (
            <div key={r.id} className="p-3 rounded-xl border" style={{ borderColor: r.status === "accepted" ? "var(--green)" : "var(--border)", background: r.status === "accepted" ? "var(--green-bg)" : "#fff" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: "var(--slate)" }}>{r.request_type}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {r.from_date}{r.to_date ? ` → ${r.to_date}` : ""}
                  </div>
                  {r.status === "accepted" && r.accepted_by_name && (
                    <div className="text-xs mt-1.5 font-medium" style={{ color: "var(--green)" }}>
                      ✅ Accepted by {r.accepted_by_name}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={r.status === "accepted"
                      ? { background: "var(--green)", color: "#fff" }
                      : r.status === "rejected"
                      ? { background: "#FEF2F2", color: "#DC2626" }
                      : { background: "#FFF7ED", color: "#C2410C" }}>
                    {r.status === "accepted" ? "Accepted" : r.status === "rejected" ? "Rejected" : "Pending"}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{timeAgo(r.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
