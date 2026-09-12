import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Tab = "home" | "requests" | "create" | "profile";
interface Props { onNavigate: (tab: Tab) => void; }

export default function TeacherHome({ onNavigate }: Props) {
  const [name, setName] = useState("Faculty");
  const [pendingRequests, setPendingRequests] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [branch, setBranch] = useState("");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const m = user.user_metadata ?? {};
      setName(m.full_name ?? user.email?.split("@")[0] ?? "Faculty");
      setBranch(m.branch ?? "");

      const b = m.branch ?? "";
      if (b) {
        const { count } = await supabase
          .from("requests")
          .select("*", { count: "exact", head: true })
          .eq("branch", b)
          .eq("status", "pending");
        setPendingRequests(count ?? 0);
      }

      const { count: pc } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });
      setPostCount(pc ?? 0);
    }
    load();
  }, []);

  return (
    <div className="bg-white min-h-full">
      {/* Greeting */}
      <div className="px-4 pt-4 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-xl font-bold" style={{ color: "var(--slate)" }}>{greeting},<br />{name}!</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{"Here's what's happening today."}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <button onClick={() => onNavigate("requests")}
          className="rounded-2xl border p-4 text-left transition-all hover:shadow-sm"
          style={{ borderColor: "var(--border)", background: "#fff" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: "var(--purple-bg)" }}>📋</div>
          <div className="text-2xl font-bold" style={{ color: "var(--purple)" }}>{pendingRequests}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Student Requests</div>
        </button>

        <button onClick={() => onNavigate("create")}
          className="rounded-2xl border p-4 text-left transition-all hover:shadow-sm"
          style={{ borderColor: "var(--border)", background: "#fff" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: "var(--green-bg)" }}>📝</div>
          <div className="text-2xl font-bold" style={{ color: "var(--green)" }}>{postCount}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Total Posts</div>
        </button>
      </div>

      {/* Recent student requests */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm" style={{ color: "var(--slate)" }}>
            Pending Requests {branch && <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {branch}</span>}
          </h2>
          <button onClick={() => onNavigate("requests")} className="text-xs font-medium" style={{ color: "var(--green)" }}>View all</button>
        </div>
        <RecentRequests branch={branch} onNavigate={onNavigate} />
      </div>

      {/* Recent posts */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm" style={{ color: "var(--slate)" }}>Recent Posts</h2>
          <button onClick={() => onNavigate("create")} className="text-xs font-medium" style={{ color: "var(--green)" }}>Create new</button>
        </div>
        <RecentPosts />
      </div>
    </div>
  );
}

function RecentRequests({ branch, onNavigate }: { branch: string; onNavigate: (t: "home"|"requests"|"create"|"profile") => void }) {
  const [items, setItems] = useState<{ id: string; student_name: string; request_type: string; created_at: string }[]>([]);

  useEffect(() => {
    if (!branch) return;
    supabase.from("requests").select("id,student_name,request_type,created_at")
      .eq("branch", branch).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(3)
      .then(({ data }) => setItems(data ?? []));
  }, [branch]);

  if (items.length === 0) return (
    <div className="rounded-2xl border py-6 text-center text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
      No pending requests
    </div>
  );

  return (
    <div className="space-y-2">
      {items.map(r => (
        <button key={r.id} onClick={() => onNavigate("requests")}
          className="w-full flex items-center gap-3 p-3 rounded-xl border text-left hover:bg-slate-50 transition-colors"
          style={{ borderColor: "var(--border)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "var(--purple)" }}>
            {r.student_name.split(" ").map((w: string) => w[0]).join("").slice(0,2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: "var(--slate)" }}>{r.student_name}</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>{r.request_type}</div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: "#FFF7ED", color: "#C2410C" }}>Pending</span>
        </button>
      ))}
    </div>
  );
}

function RecentPosts() {
  const [posts, setPosts] = useState<{ id: string; author_name: string; content: string; tag: string; created_at: string }[]>([]);

  useEffect(() => {
    supabase.from("posts").select("id,author_name,content,tag,created_at")
      .order("created_at", { ascending: false }).limit(3)
      .then(({ data }) => setPosts(data ?? []));
  }, []);

  if (posts.length === 0) return (
    <div className="rounded-2xl border py-6 text-center text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
      No posts yet
    </div>
  );

  return (
    <div className="space-y-2">
      {posts.map(p => (
        <div key={p.id} className="p-3 rounded-xl border" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: "var(--slate)" }}>{p.author_name}</span>
            {p.tag && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--green-bg)", color: "var(--green)" }}>{p.tag}</span>}
          </div>
          <p className="text-xs line-clamp-2" style={{ color: "var(--muted)" }}>{p.content}</p>
        </div>
      ))}
    </div>
  );
}
