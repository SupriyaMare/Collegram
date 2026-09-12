import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { findStudentByEmail } from "../../lib/studentLookup";

interface Post {
  id: string;
  author_name: string;
  author_role: string;
  content: string;
  tag: string | null;
  image_url: string | null;
  created_at: string;
}

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function authorColor(name: string) {
  const colors = ["#7C3AED", "#16A34A", "#F97316", "#0EA5E9", "#DB2777", "#D97706"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length;
  return colors[h];
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

type FeedTab = "latest" | "foryou";

export default function StudentHome() {
  const [feedTab, setFeedTab] = useState<FeedTab>("latest");
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("Student");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const email = user.email ?? "";
        const data = await findStudentByEmail(email, "\"First Name\"");
        if (data) setStudentName((data as Record<string, string>)["First Name"] ?? "Student");
      }

      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (postData && postData.length > 0) {
        setPosts(postData as Post[]);
        const ids = postData.map((p: Post) => p.id);

        const { data: likeData } = await supabase
          .from("post_likes")
          .select("post_id")
          .in("post_id", ids);

        const counts: Record<string, number> = {};
        ids.forEach((id: string) => (counts[id] = 0));
        likeData?.forEach((l: { post_id: string }) => {
          counts[l.post_id] = (counts[l.post_id] ?? 0) + 1;
        });
        setLikeCounts(counts);

        if (user) {
          const { data: myLikes } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", ids);
          setLikedIds(new Set(myLikes?.map((l: { post_id: string }) => l.post_id) ?? []));
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  async function toggleLike(postId: string) {
    if (!userId) return;
    const liked = likedIds.has(postId);
    setLikedIds((prev) => {
      const next = new Set(prev);
      liked ? next.delete(postId) : next.add(postId);
      return next;
    });
    setLikeCounts((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + (liked ? -1 : 1) }));
    if (liked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ background: "#fff" }}>
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold" style={{ color: "var(--slate)" }}>{greeting}, {studentName}! 👋</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>Stay updated. Stay connected.</p>
      </div>

      <div className="px-4 flex gap-4 border-b" style={{ borderColor: "var(--border)" }}>
        {(["latest", "foryou"] as FeedTab[]).map((t) => (
          <button key={t} onClick={() => setFeedTab(t)}
            className="pb-2.5 text-sm font-semibold transition-colors border-b-2"
            style={{ color: feedTab === t ? "var(--green)" : "var(--muted)", borderBottomColor: feedTab === t ? "var(--green)" : "transparent" }}>
            {t === "latest" ? "Latest Posts" : "For You"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm" style={{ color: "var(--muted)" }}>Loading posts…</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="text-4xl">📭</div>
          <p className="text-sm font-medium" style={{ color: "var(--slate)" }}>No posts yet</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Faculty will post updates here</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {posts.map((post) => {
            const color = authorColor(post.author_name);
            const liked = likedIds.has(post.id);
            const count = likeCounts[post.id] ?? 0;
            return (
              <article key={post.id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: color }}>
                    {initials(post.author_name)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm" style={{ color: "var(--slate)" }}>{post.author_name}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{post.author_role} · {timeAgo(post.created_at)}</div>
                  </div>
                  {post.tag && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ color, background: `${color}20` }}>
                      {post.tag}
                    </span>
                  )}
                </div>

                <p className="text-sm" style={{ color: "var(--slate)" }}>{post.content}</p>
                {post.image_url && (
                  <img src={post.image_url} alt="Post image" className="mt-3 w-full rounded-2xl object-cover max-h-56" />
                )}

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="flex items-center gap-1.5 text-sm transition-all"
                    style={{ color: liked ? "#EF4444" : "var(--muted)" }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"}>
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                    <span className="font-medium">{count > 0 ? `${count} ` : ""}{liked ? "Liked" : "Like"}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
