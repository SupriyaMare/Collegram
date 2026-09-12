import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface Props { onLogout: () => void; }

const BRANCH_COLORS: Record<string, string> = {
  CSE: "#7C3AED",
  CSD: "#0EA5E9",
  CSM: "#F97316",
};

const BRANCH_BG: Record<string, string> = {
  CSE: "#F5F3FF",
  CSD: "#E0F2FE",
  CSM: "#FFF7ED",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function roleLabel(role: string, designation: string | undefined, branch: string | undefined) {
  if (designation) return designation;
  if (role === "hod" && branch) return `HOD – ${branch}`;
  if (role === "principal") return "Principal";
  if (branch) return `Faculty – ${branch}`;
  return "Faculty";
}

export default function TeacherProfile({ onLogout }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("teacher");
  const [branch, setBranch] = useState("");
  const [designation, setDesignation] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const m = user.user_metadata ?? {};
      setEmail(user.email ?? "");
      setName(m.full_name ?? user.email?.split("@")[0] ?? "Faculty");
      setRole(m.role ?? "teacher");
      setBranch(m.branch ?? "");
      setDesignation(m.designation);
      setLoading(false);
    });
  }, []);

  const label = roleLabel(role, designation, branch);
  const color = branch ? (BRANCH_COLORS[branch] ?? "var(--purple)") : "var(--purple)";
  const bg = branch ? (BRANCH_BG[branch] ?? "var(--purple-bg)") : "var(--purple-bg)";

  const roleTag = role === "principal"
    ? { text: "Principal", bg: "#FEF3C7", color: "#D97706" }
    : role === "hod"
    ? { text: "HOD", bg: "#F5F3FF", color: "#7C3AED" }
    : { text: "Faculty", bg: "var(--green-bg)", color: "var(--green)" };

  if (loading) return (
    <div className="min-h-full flex items-center justify-center">
      <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>
    </div>
  );

  return (
    <div className="bg-white min-h-full">
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold text-base" style={{ color: "var(--slate)" }}>My Profile</h2>
      </div>

      {/* Hero */}
      <div className="p-5 flex items-center gap-4 border-b"
        style={{ borderColor: "var(--border)", background: `linear-gradient(135deg, ${bg} 0%, #EEF2FF 100%)` }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
          style={{ background: color, border: `3px solid ${color}` }}>
          {initials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold truncate" style={{ color: "var(--slate)" }}>{name}</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{label}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: roleTag.bg, color: roleTag.color }}>
              {roleTag.text}
            </span>
            {branch && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: bg, color }}>
                {branch}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="divide-y border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-lg">✉️</span>
          <div className="flex-1">
            <div className="text-xs" style={{ color: "var(--muted)" }}>Email</div>
            <div className="text-sm font-medium mt-0.5 truncate" style={{ color: "var(--slate)" }}>{email}</div>
          </div>
        </div>
        {branch && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="text-lg">🏫</span>
            <div className="flex-1">
              <div className="text-xs" style={{ color: "var(--muted)" }}>Department</div>
              <div className="text-sm font-medium mt-0.5" style={{ color: "var(--slate)" }}>
                {{
                  CSE: "Computer Science & Engineering",
                  CSD: "Computer Science & Data Science",
                  CSM: "Computer Science & Machine Learning",
                }[branch] ?? branch}
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-lg">🎓</span>
          <div className="flex-1">
            <div className="text-xs" style={{ color: "var(--muted)" }}>Designation</div>
            <div className="text-sm font-medium mt-0.5" style={{ color: "var(--slate)" }}>{label}</div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="border-t" style={{ borderColor: "var(--border)" }}>
        <button
          className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 transition-colors text-left"
          onClick={() => { setShowChangePwd(!showChangePwd); setPwdMsg(null); }}
        >
          <span className="text-lg">🔑</span>
          <span className="flex-1 text-sm font-semibold" style={{ color: "var(--slate)" }}>Change Password</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            style={{ color: "var(--muted)", transform: showChangePwd ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {showChangePwd && (
          <div className="px-4 pb-4 space-y-3" style={{ background: "var(--surface)" }}>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Default password is your Faculty ID. Set a new one below.
            </p>
            <input
              type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
              style={{ borderColor: "var(--border)", background: "#fff", color: "var(--slate)" }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--purple)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
            />
            <input
              type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
              style={{ borderColor: "var(--border)", background: "#fff", color: "var(--slate)" }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--purple)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
            />
            {pwdMsg && (
              <div className="rounded-xl px-4 py-2.5 text-xs"
                style={{ background: pwdMsg.ok ? "var(--green-bg)" : "#FEF2F2", color: pwdMsg.ok ? "var(--green)" : "#DC2626" }}>
                {pwdMsg.text}
              </div>
            )}
            <button
              disabled={pwdLoading || newPwd.length < 6}
              onClick={async () => {
                if (newPwd !== confirmPwd) { setPwdMsg({ text: "Passwords don't match.", ok: false }); return; }
                setPwdLoading(true);
                const { error } = await supabase.auth.updateUser({ password: newPwd });
                if (error) { setPwdMsg({ text: error.message, ok: false }); }
                else {
                  setPwdMsg({ text: "Password updated successfully!", ok: true });
                  setNewPwd(""); setConfirmPwd("");
                  setTimeout(() => setShowChangePwd(false), 1500);
                }
                setPwdLoading(false);
              }}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: "var(--purple)" }}
            >
              {pwdLoading ? "Updating…" : "Update Password"}
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="divide-y border-t" style={{ borderColor: "var(--border)" }}>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 transition-colors text-left">
          <span className="text-lg">🚪</span>
          <span className="text-sm font-medium" style={{ color: "var(--red)" }}>Logout</span>
        </button>
      </div>
    </div>
  );
}
