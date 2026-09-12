import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { findStudentByEmail } from "../../lib/studentLookup";

interface Props { onLogout: () => void; }

interface StudentRow {
  "Rollnumber": string;
  "Name of Student": string;
  "Department": string;
  "Course": string;
  "College Name": string;
  "Domain Mail ID": string;
  "Personal Mail ID": string;
  "Student Phone No.": string | number;
  "Gender": string;
  "Student Blood Group": string;
  "Date of Birth\n (dd/mm/yyyy)": string;
  "FATHER NAME": string;
  "MOTHER NAME": string;
  "Parent Email-id": string;
  "Parent Mobile Number": string;
  "Social Category": string;
  "College Hostel": string;
  "Fee Reimbursement": string;
  "UG Year of Pass": number;
  "Nationality": string;
  "Religion": string;
  "City(Write complete city name)": string;
  "State(Write complete state name)": string;
  "PIN Code": string | number;
  "10th Name of Board": string;
  "Name of the School": string;
  "10th Percentage%": string | number;
  "10th Year of Pass": number;
  "12th Mode": string;
  "Name of the college": string;
  "12th Percentage%": string | number;
  "12th Year of Pass": number;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function StudentProfile({ onLogout }: Props) {
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const email = user.email ?? "";

      const data = await findStudentByEmail(email);

      if (!data) {
        setError("No student record found for your account.");
      } else {
        setStudent(data as StudentRow);
        // Load avatar
        const { data: fileData } = await supabase.storage
          .from("avatars")
          .list(`${user.id}/`, { limit: 1 });
        if (fileData && fileData.length > 0) {
          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(`${user.id}/${fileData[0].name}`);
          setAvatarUrl(urlData.publicUrl);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl + `?t=${Date.now()}`);
    }
    setUploading(false);
  }

  if (loading) return (
    <div className="min-h-full flex items-center justify-center">
      <div className="text-sm" style={{ color: "var(--muted)" }}>Loading profile…</div>
    </div>
  );

  if (error || !student) return (
    <div className="min-h-full flex flex-col">
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold text-base" style={{ color: "var(--slate)" }}>My Profile</h2>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 text-center">
        <div className="text-4xl">🔍</div>
        <p className="text-sm font-medium" style={{ color: "var(--slate)" }}>Record not linked</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {error ?? "No student record matched your account. Contact admin."}
        </p>
        <button onClick={onLogout} className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--green)" }}>
          Sign Out
        </button>
      </div>
    </div>
  );

  const sections = [
    {
      id: "personal",
      title: "Personal Info",
      icon: "👤",
      rows: [
        { label: "Full Name", value: student["Name of Student"] },
        { label: "Date of Birth", value: student["Date of Birth\n (dd/mm/yyyy)"] },
        { label: "Gender", value: student["Gender"] },
        { label: "Blood Group", value: student["Student Blood Group"] },
        { label: "Nationality", value: student["Nationality"] },
        { label: "Religion", value: student["Religion"] },
        { label: "Social Category", value: student["Social Category"] },
      ],
    },
    {
      id: "academic",
      title: "Academic Info",
      icon: "🎓",
      rows: [
        { label: "Roll Number", value: student["Rollnumber"], mono: true },
        { label: "College", value: student["College Name"] },
        { label: "Course", value: student["Course"] },
        { label: "Department", value: student["Department"] },
        { label: "Year of Pass", value: String(student["UG Year of Pass"]) },
        { label: "Hostel", value: student["College Hostel"] },
        { label: "Fee Reimbursement", value: student["Fee Reimbursement"] },
      ],
    },
    {
      id: "contact",
      title: "Contact & Address",
      icon: "📱",
      rows: [
        { label: "Phone", value: String(student["Student Phone No."]) },
        { label: "Domain Email", value: student["Domain Mail ID"] },
        { label: "Personal Email", value: student["Personal Mail ID"] },
        { label: "City", value: student["City(Write complete city name)"] },
        { label: "State", value: student["State(Write complete state name)"] },
        { label: "PIN Code", value: String(student["PIN Code"]) },
      ],
    },
    {
      id: "family",
      title: "Family Info",
      icon: "👨‍👩‍👧",
      rows: [
        { label: "Father Name", value: student["FATHER NAME"] },
        { label: "Mother Name", value: student["MOTHER NAME"] },
        { label: "Parent Email", value: student["Parent Email-id"] },
        { label: "Parent Mobile", value: String(student["Parent Mobile Number"]) },
      ],
    },
    {
      id: "education",
      title: "Education History",
      icon: "📚",
      rows: [
        { label: "10th Board", value: student["10th Name of Board"] },
        { label: "10th School", value: student["Name of the School"] },
        { label: "10th %", value: String(student["10th Percentage%"]) },
        { label: "10th Year", value: String(student["10th Year of Pass"]) },
        { label: "12th Mode", value: student["12th Mode"] },
        { label: "12th College", value: student["Name of the college"] },
        { label: "12th %", value: String(student["12th Percentage%"]) },
        { label: "12th Year", value: String(student["12th Year of Pass"]) },
      ],
    },
  ];

  return (
    <div className="bg-white min-h-full">
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold text-base" style={{ color: "var(--slate)" }}>My Profile</h2>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--green)" }} />
          <span className="text-xs" style={{ color: "var(--muted)" }}>Live</span>
        </div>
      </div>

      {/* Avatar + core info */}
      <div className="p-4 flex items-center gap-4 border-b" style={{ borderColor: "var(--border)", background: "linear-gradient(135deg, #F0FDF4 0%, #EEF2FF 100%)" }}>
        <div className="relative flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover"
              style={{ border: "3px solid var(--green)" }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
              style={{ background: "var(--purple)", border: "3px solid var(--purple)" }}
            >
              {initials(student["Name of Student"])}
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white shadow"
            style={{ background: "var(--green)" }}
            title="Change photo"
          >
            {uploading ? (
              <span className="text-xs">…</span>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold truncate" style={{ color: "var(--slate)" }}>{student["Name of Student"]}</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
            {student["Rollnumber"]}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {student["Course"]} · {student["Department"]}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "var(--green-bg)", color: "var(--green)" }}>
              {student["College Name"]}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "var(--purple-bg)", color: "var(--purple)" }}>
              {student["Social Category"]}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable sections */}
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {sections.map((sec) => (
          <div key={sec.id}>
            <button
              className="w-full flex items-center gap-3 px-4 py-4 text-left"
              onClick={() => setExpanded(expanded === sec.id ? null : sec.id)}
            >
              <span className="text-lg">{sec.icon}</span>
              <span className="flex-1 text-sm font-semibold" style={{ color: "var(--slate)" }}>{sec.title}</span>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                style={{ color: "var(--muted)", transform: expanded === sec.id ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}
              >
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            {expanded === sec.id && (
              <div className="pb-3 px-4" style={{ background: "var(--surface)" }}>
                {sec.rows.map((row, i) =>
                  row.value && row.value !== "null" && row.value !== "undefined" ? (
                    <div key={i} className="flex justify-between items-start py-2.5 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>{row.label}</span>
                      <span
                        className="text-xs font-medium text-right max-w-[55%]"
                        style={{ color: "var(--slate)", fontFamily: (row as { mono?: boolean }).mono ? "'JetBrains Mono', monospace" : undefined }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Change Password */}
      <div className="border-t" style={{ borderColor: "var(--border)" }}>
        <button
          className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 transition-colors text-left"
          onClick={() => { setShowChangePassword(!showChangePassword); setPwdMsg(null); }}
        >
          <span className="text-lg">🔑</span>
          <span className="flex-1 text-sm font-semibold" style={{ color: "var(--slate)" }}>Change Password</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            style={{ color: "var(--muted)", transform: showChangePassword ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {showChangePassword && (
          <div className="px-4 pb-4 space-y-3" style={{ background: "var(--surface)" }}>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Your default password is your roll number. Set a new one below.
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
              style={{ borderColor: "var(--border)", background: "#fff", color: "var(--slate)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
              style={{ borderColor: "var(--border)", background: "#fff", color: "var(--slate)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
            {pwdMsg && (
              <div className="rounded-xl px-4 py-2.5 text-xs"
                style={{ background: pwdMsg.ok ? "var(--green-bg)" : "#FEF2F2", color: pwdMsg.ok ? "var(--green)" : "#DC2626" }}>
                {pwdMsg.text}
              </div>
            )}
            <button
              disabled={pwdLoading || newPassword.length < 6}
              onClick={async () => {
                if (newPassword !== confirmPassword) { setPwdMsg({ text: "Passwords don't match.", ok: false }); return; }
                setPwdLoading(true);
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) {
                  setPwdMsg({ text: error.message, ok: false });
                } else {
                  setPwdMsg({ text: "Password updated successfully!", ok: true });
                  setNewPassword("");
                  setConfirmPassword("");
                  setTimeout(() => setShowChangePassword(false), 1500);
                }
                setPwdLoading(false);
              }}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: "var(--green)" }}
            >
              {pwdLoading ? "Updating…" : "Update Password"}
            </button>
          </div>
        )}
      </div>

      <div className="border-t" style={{ borderColor: "var(--border)" }}>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 transition-colors text-left">
          <span className="text-lg">🚪</span>
          <span className="text-sm font-medium" style={{ color: "#DC2626" }}>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
