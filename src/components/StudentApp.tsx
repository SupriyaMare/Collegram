import { useEffect, useState } from "react";
import StudentHome from "./student/StudentHome";
import StudentRequests from "./student/StudentRequests";
import StudentPayment from "./student/StudentPayment";
import StudentProfile from "./student/StudentProfile";
import NotificationPanel from "./NotificationPanel";
import { supabase } from "../lib/supabase";

type Tab = "home" | "requests" | "payment" | "profile";

interface Props { onLogout: () => void; }

const NavIcon = ({ id }: { id: Tab }) => {
  if (id === "home") return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 12L12 4l9 8v9a1 1 0 01-1 1H14v-5h-4v5H4a1 1 0 01-1-1v-9z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (id === "requests") return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (id === "payment") return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M2 10h20M6 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
};

const tabLabels: Record<Tab, string> = { home: "Home", requests: "Requests", payment: "Payments", profile: "Profile" };

export default function StudentApp({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>("home");
  const [showNotifs, setShowNotifs] = useState(false);
  const [unread, setUnread] = useState(0);
  const [userId, setUserId] = useState("");
  const [avatarInitials, setAvatarInitials] = useState("S");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const name = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "S";
      setAvatarInitials(name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() || "S");
    });
  }, []);

  const tabs: Tab[] = ["home", "requests", "payment", "profile"];

  return (
    <div className="min-h-full flex flex-col" style={{ background: "#F8FAFC", fontFamily: "'Outfit', sans-serif" }}>
      <header className="sticky top-0 z-20 bg-white border-b px-4 py-3 flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <img src="/app-icon.png" alt="Collegram" className="w-8 h-8 rounded-xl object-cover" />
        </div>
        <div className="flex items-center gap-3">
          <button className="relative" style={{ color: "var(--muted)" }} onClick={() => setShowNotifs(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
                style={{ background: "var(--red)", fontSize: 9 }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--purple-bg)", color: "var(--purple)" }}>
            {avatarInitials}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        {tab === "home" && <StudentHome />}
        {tab === "requests" && <StudentRequests />}
        {tab === "payment" && <StudentPayment />}
        {tab === "profile" && <StudentProfile onLogout={onLogout} />}
      </main>

      <nav className="sticky bottom-0 z-20 bg-white border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors"
              style={{ color: tab === t ? "var(--green)" : "var(--muted)" }}>
              <NavIcon id={t} />
              <span className="text-xs font-medium">{tabLabels[t]}</span>
            </button>
          ))}
        </div>
      </nav>

      {userId && (
        <NotificationPanel
          open={showNotifs}
          onClose={() => setShowNotifs(false)}
          role="student"
          userId={userId}
          onUnreadCount={setUnread}
        />
      )}
    </div>
  );
}
