import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import AuthScreen from "./components/AuthScreen";
import StudentApp from "./components/StudentApp";
import TeacherApp from "./components/TeacherApp";

type Role = "student" | "teacher";

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        const r = data.session.user.user_metadata?.role as Role | undefined;
        setRole(r ?? "student");
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        const r = s.user.user_metadata?.role as Role | undefined;
        setRole(r ?? "student");
      } else {
        setRole(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // Still resolving session
  if (session === undefined) {
    return (
      <div
        className="min-h-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #F0FDF4 0%, #EEF2FF 100%)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--green)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L2 9l10 6 10-6-10-6z" fill="white" />
              <path
                d="M2 15l10 6 10-6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                opacity="0.7"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onAuth={setRole} />;
  }

  if (role === "teacher") return <TeacherApp onLogout={handleLogout} />;
  return <StudentApp onLogout={handleLogout} />;
}
