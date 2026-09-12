import { useState } from "react";
import { supabase } from "../lib/supabase";
import { findStudentByEmail } from "../lib/studentLookup";

type Role = "student" | "teacher";
type Mode = "student" | "faculty";

interface Props {
  onAuth: (role: Role) => void;
}

export default function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<Mode>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(m: Mode) {
    setMode(m);
    setEmail("");
    setPassword("");
    setError(null);
  }

  async function handleStudentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });

    if (!signInErr && data.user) {
      const role = (data.user.user_metadata?.role as Role) ?? "student";
      onAuth(role);
      setLoading(false);
      return;
    }

    const isInvalidCreds = signInErr?.message?.toLowerCase().includes("invalid login credentials");

    if (isInvalidCreds) {
      const studentRow = await findStudentByEmail(email, "\"Rollnumber\", \"Name of Student\"");

      if (studentRow && String(studentRow["Rollnumber"]) === String(password)) {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role: "student", roll_number: studentRow["Rollnumber"] } },
        });
        if (signUpErr && !signUpErr.message.includes("already registered")) {
          setError(signUpErr.message);
          setLoading(false);
          return;
        }
        const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (e2 || !d2.user) {
          setError("Signed up! If asked to confirm email, disable that in Supabase Auth settings.");
        } else {
          onAuth("student");
        }
      } else {
        setError("Incorrect email or roll number.");
      }
    } else {
      setError("Sign in failed. Please try again.");
    }

    setLoading(false);
  }

  async function handleFacultySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });

    if (!signInErr && data.user) {
      const role = (data.user.user_metadata?.role as Role) ?? "teacher";
      onAuth(role);
      setLoading(false);
      return;
    }

    // Auto-provision from faculty table if account not yet in auth
    const isInvalidCreds = signInErr?.message?.toLowerCase().includes("invalid login credentials");
    if (isInvalidCreds) {
      // Query by email only — compare Faculty ID in JS to avoid PostgREST space issues
      const { data: facRow } = await supabase
        .from("faculty")
        .select("\"Faculty ID\", \"Faculty name\"")
        .eq("gmail", email)
        .limit(1)
        .maybeSingle();

      if (!facRow) {
        setError("DEBUG: Faculty email not found in faculty table.");
        setLoading(false);
        return;
      }

      if (String(facRow["Faculty ID"]) !== String(password)) {
        setError(`DEBUG: Faculty ID mismatch. DB has: "${facRow["Faculty ID"]}", you typed: "${password}"`);
        setLoading(false);
        return;
      }

      if (facRow) {
        const fid = facRow["Faculty ID"] as string;
        const uRole = fid.startsWith("HOD") ? "hod" : fid.startsWith("PRI") ? "principal" : "teacher";
        const branch = fid === "HOD001" ? "CSE" : fid === "HOD002" ? "CSD" : fid === "HOD003" ? "CSM"
          : ["FAC001","FAC002","FAC003","FAC004"].includes(fid) ? "CSE"
          : ["FAC005","FAC006","FAC007"].includes(fid) ? "CSD" : "CSM";
        const { error: signUpErr } = await supabase.auth.signUp({
          email, password,
          options: { data: { role: uRole, branch, full_name: facRow["Faculty name"], designation: uRole === "hod" ? "HOD - " + branch : uRole === "principal" ? "Principal" : "Faculty - " + branch } },
        });
        const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (!e2 && d2.user) { onAuth("teacher"); } else {
          setError(`DEBUG: signUp=${signUpErr?.message ?? "ok"} | signIn=${e2?.message ?? "ok"}`);
        }
      } else {
        setError("Invalid credentials. Use your college email and Faculty ID as password.");
      }
    } else {
      setError("Sign in failed. Please try again.");
    }

    setLoading(false);
  }

  return (
    <div
      className="min-h-full flex items-center justify-center p-6"
      style={{ background: mode === "faculty"
        ? "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)"
        : "linear-gradient(135deg, #F0FDF4 0%, #EEF2FF 100%)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-2 mb-2">
            <img src="/app-icon.png" alt="Collegram" className="w-20 h-20 rounded-3xl object-cover shadow-md" />
            <span className="text-2xl font-bold" style={{ color: "var(--slate)" }}>Collegram</span>
          </div>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Stay updated. Stay connected.</p>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-2xl p-1 mb-5 gap-1" style={{ background: "rgba(0,0,0,0.06)" }}>
          <button
            onClick={() => switchMode("student")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={mode === "student"
              ? { background: "#fff", color: "var(--green)", boxShadow: "0 1px 4px rgba(0,0,0,0.10)" }
              : { color: "var(--muted)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L2 9l10 6 10-6-10-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
              <path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Student
          </button>
          <button
            onClick={() => switchMode("faculty")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={mode === "faculty"
              ? { background: "#fff", color: "var(--purple)", boxShadow: "0 1px 4px rgba(0,0,0,0.10)" }
              : { color: "var(--muted)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Faculty
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm border p-6" style={{ borderColor: "var(--border)" }}>

          {mode === "student" ? (
            <>
              <h2 className="text-base font-bold mb-1" style={{ color: "var(--slate)" }}>Student Login</h2>
              <p className="text-xs mb-5" style={{ color: "var(--muted)" }}>
                Use your <strong>personal email</strong> and <strong>roll number</strong> as password.
              </p>

              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--slate)" }}>Email</label>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full rounded-xl px-4 py-3 text-sm border outline-none transition-all"
                    style={{ borderColor: "var(--border)", color: "var(--slate)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--slate)" }}>
                    Password <span style={{ color: "var(--muted)", fontWeight: 400 }}>(your roll number)</span>
                  </label>
                  <input
                    type="password" required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="e.g. 22A91A0501"
                    className="w-full rounded-xl px-4 py-3 text-sm border outline-none transition-all"
                    style={{ borderColor: "var(--border)", color: "var(--slate)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>

                {error && (
                  <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "#FEF2F2", color: "#DC2626" }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all duration-200"
                  style={{ background: loading ? "var(--muted)" : "var(--green)", cursor: loading ? "not-allowed" : "pointer" }}
                >
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--purple-bg)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="var(--purple)" strokeWidth="2"/>
                    <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2 className="text-base font-bold" style={{ color: "var(--slate)" }}>Faculty Login</h2>
              </div>
              <p className="text-xs mb-5" style={{ color: "var(--muted)" }}>
                Email: your college email · Password: your <strong>Faculty ID</strong> (e.g. FAC001, HOD1)
              </p>

              <form onSubmit={handleFacultySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--slate)" }}>College Email</label>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gvpce.ac.in"
                    className="w-full rounded-xl px-4 py-3 text-sm border outline-none transition-all"
                    style={{ borderColor: "var(--border)", color: "var(--slate)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--purple)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--slate)" }}>Password</label>
                  <input
                    type="password" required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full rounded-xl px-4 py-3 text-sm border outline-none transition-all"
                    style={{ borderColor: "var(--border)", color: "var(--slate)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--purple)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>

                {error && (
                  <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "#FEF2F2", color: "#DC2626" }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all duration-200"
                  style={{ background: loading ? "var(--muted)" : "var(--purple)", cursor: loading ? "not-allowed" : "pointer" }}
                >
                  {loading ? "Signing in…" : "Sign In as Faculty"}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t text-center" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Don't have access? Contact your administrator.
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--muted)" }}>
          Collegram · College Management Platform
        </p>
      </div>
    </div>
  );
}
