import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

type PostTab = "post" | "event";

export default function TeacherCreate() {
  const [tab, setTab] = useState<PostTab>("post");
  const [postText, setPostText] = useState("");
  const [postTo, setPostTo] = useState("All Students");
  const [tag, setTag] = useState("Announcement");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("Faculty");
  const [authorRole, setAuthorRole] = useState("Faculty");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const m = user.user_metadata ?? {};
      const uname = m.full_name ?? user.email?.split("@")[0] ?? "Faculty";
      const branch = m.branch ?? "";
      const role = m.role ?? "teacher";
      const designation = m.designation;
      const label = designation
        ?? (role === "hod" && branch ? `HOD – ${branch}`
          : role === "principal" ? "Principal"
          : branch ? `Faculty – ${branch}` : "Faculty");
      setAuthorName(uname);
      setAuthorRole(label);
    });
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploading(true);

    let image_url: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `posts/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("post-images")
        .upload(path, imageFile, { upsert: true });
      if (uploadErr) {
        setError("Image upload failed: " + uploadErr.message);
        setUploading(false);
        return;
      }
      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      image_url = data.publicUrl;
    }

    const content = tab === "post"
      ? postText
      : `${eventTitle}\n\n${eventDesc}${eventDate ? `\n📅 ${eventDate}${eventTime ? " " + eventTime : ""}` : ""}${eventVenue ? `\n📍 ${eventVenue}` : ""}`;

    const { error: insertErr } = await supabase.from("posts").insert({
      author_name: authorName,
      author_role: authorRole,
      content,
      tag: tab === "event" ? "Event" : tag,
      image_url,
    });

    setUploading(false);

    if (insertErr) {
      setError(insertErr.message);
      return;
    }

    setPublished(true);
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
    setTimeout(() => {
      setPublished(false);
      setPostText("");
      setEventTitle("");
      setEventDesc("");
      setEventDate("");
      setEventTime("");
      setEventVenue("");
    }, 2000);
  };

  return (
    <div className="bg-white min-h-full">
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold text-base" style={{ color: "var(--slate)" }}>Create Post</h2>
      </div>

      <div className="mx-4 mt-4 mb-4 grid grid-cols-2 rounded-xl p-1" style={{ background: "var(--surface)" }}>
        {(["post", "event"] as PostTab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); removeImage(); }}
            className="py-2.5 rounded-lg text-sm font-semibold transition-all capitalize"
            style={tab === t
              ? { background: "var(--green)", color: "#fff", boxShadow: "0 2px 8px rgba(22,163,74,0.3)" }
              : { color: "var(--muted)" }}>
            {t === "post" ? "Post" : "Event"}
          </button>
        ))}
      </div>

      <form onSubmit={handlePublish} className="px-4 space-y-4 pb-6">
        {tab === "post" ? (
          <>
            <div>
              <textarea rows={5} value={postText} onChange={e => setPostText(e.target.value)}
                placeholder="Share updates with students..."
                maxLength={500} required
                className="w-full border rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none"
                style={{ borderColor: "var(--border)", color: "var(--slate)" }} />
              <div className="text-right text-xs mt-1" style={{ color: "var(--muted)" }}>{postText.length}/500</div>
            </div>

            {/* Image upload */}
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                <img src={imagePreview} alt="Preview" className="w-full object-cover max-h-48" />
                <button type="button" onClick={removeImage}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md"
                  style={{ background: "rgba(0,0,0,0.6)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <div className="px-3 py-2 text-xs" style={{ color: "var(--muted)" }}>
                  {imageFile?.name} · {((imageFile?.size ?? 0) / 1024).toFixed(0)} KB
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-8 cursor-pointer hover:bg-slate-50 transition-colors"
                style={{ borderColor: "var(--border)", borderStyle: "dashed" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--green-bg)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: "var(--green)" }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                    <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-sm font-medium" style={{ color: "var(--green)" }}>Add image / poster</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>JPG, PNG (Max 5MB)</span>
                <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            )}

            {/* Tag */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--slate)" }}>Tag</label>
              <div className="flex gap-2 flex-wrap">
                {["Announcement", "Workshop", "Placement", "Exam", "Holiday"].map((t) => (
                  <button key={t} type="button" onClick={() => setTag(t)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    style={tag === t
                      ? { background: "var(--green)", color: "#fff", borderColor: "var(--green)" }
                      : { borderColor: "var(--border)", color: "var(--muted)" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--slate)" }}>Post to</label>
              <div className="relative">
                <select value={postTo} onChange={e => setPostTo(e.target.value)}
                  className="w-full border rounded-xl px-3 py-3 text-sm appearance-none focus:outline-none"
                  style={{ borderColor: "var(--border)", color: "var(--slate)" }}>
                  <option>All Students</option>
                  <option>CSE Students</option>
                  <option>CSD Students</option>
                  <option>CSM Students</option>
                </select>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted)" }}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--slate)" }}>Event Title</label>
              <input type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)}
                placeholder="e.g. Tech Fest 2026" required
                className="w-full border rounded-xl px-3 py-3 text-sm focus:outline-none"
                style={{ borderColor: "var(--border)", color: "var(--slate)" }} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--slate)" }}>Description</label>
              <textarea rows={3} value={eventDesc} onChange={e => setEventDesc(e.target.value)}
                placeholder="Describe the event..." required
                className="w-full border rounded-xl px-3 py-3 text-sm resize-none focus:outline-none"
                style={{ borderColor: "var(--border)", color: "var(--slate)" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--slate)" }}>Date</label>
                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required
                  className="w-full border rounded-xl px-3 py-3 text-sm focus:outline-none"
                  style={{ borderColor: "var(--border)", color: "var(--slate)" }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--slate)" }}>Time</label>
                <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} required
                  className="w-full border rounded-xl px-3 py-3 text-sm focus:outline-none"
                  style={{ borderColor: "var(--border)", color: "var(--slate)" }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--slate)" }}>Venue</label>
              <input type="text" value={eventVenue} onChange={e => setEventVenue(e.target.value)}
                placeholder="e.g. Main Auditorium"
                className="w-full border rounded-xl px-3 py-3 text-sm focus:outline-none"
                style={{ borderColor: "var(--border)", color: "var(--slate)" }} />
            </div>

            {/* Poster upload for event */}
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                <img src={imagePreview} alt="Poster" className="w-full object-cover max-h-48" />
                <button type="button" onClick={removeImage}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md"
                  style={{ background: "rgba(0,0,0,0.6)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 rounded-2xl border-2 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                style={{ borderColor: "var(--border)", borderStyle: "dashed" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: "var(--green)" }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                  <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <span className="text-sm font-medium" style={{ color: "var(--green)" }}>Add event poster</span>
                <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            )}
          </>
        )}

        {error && (
          <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "#FEF2F2", color: "#DC2626" }}>{error}</div>
        )}

        <button type="submit" disabled={uploading}
          className="w-full py-3.5 rounded-2xl font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60"
          style={{ background: published ? "#15803D" : "var(--green)" }}>
          {uploading ? "Uploading…" : published ? "✓ Published!" : tab === "post" ? "Publish Post" : "Publish Event"}
        </button>
      </form>
    </div>
  );
}
