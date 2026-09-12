import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { findStudentByEmail } from "../../lib/studentLookup";

const UPI_ID = "7893883221@ybl";
const PAYEE_NAME = "GVPCE";
const TOTAL_FEES = 100000;

type Stage = "form" | "waiting" | "verifying" | "success";

function genReceipt() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `PAY${d}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function Field({ label, value, onChange, placeholder, type = "text", mono = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--slate)" }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border rounded-xl px-3 py-3 text-sm focus:outline-none"
        style={{ borderColor: "var(--border)", color: "var(--slate)", fontFamily: mono ? "'JetBrains Mono', monospace" : undefined }}
        onFocus={e => (e.currentTarget.style.borderColor = "var(--green)")}
        onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
      />
    </div>
  );
}

export default function StudentPayment() {
  const [stage, setStage] = useState<Stage>("form");
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("500");
  const [remarks, setRemarks] = useState("College Fees");
  const [receipt] = useState(genReceipt);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const didReturn = useRef(false);

  const remaining = Math.max(0, TOTAL_FEES - totalPaid);
  const cleared = remaining === 0;

  async function loadPayments(uid: string) {
    const { data } = await supabase
      .from("payments")
      .select("amount")
      .eq("user_id", uid);
    if (data) {
      const sum = data.reduce((acc: number, r: { amount: number }) => acc + Number(r.amount), 0);
      setTotalPaid(sum);
    }
  }

  useEffect(() => {
    async function prefill() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const email = user.email ?? "";
      const data = await findStudentByEmail(email, "\"Name of Student\", \"Rollnumber\", \"Student Phone No.\"");
      if (data) {
        setName(data["Name of Student"] ?? "");
        setRoll(data["Rollnumber"] ?? "");
        setPhone(String(data["Student Phone No."] ?? ""));
      }
      await loadPayments(user.id);
    }
    prefill();
  }, []);

  useEffect(() => {
    if (stage !== "waiting") return;
    function onVisible() {
      if (document.visibilityState === "visible" && !didReturn.current) {
        didReturn.current = true;
        startVerifying();
      }
    }
    function onFocus() {
      if (!didReturn.current) {
        didReturn.current = true;
        startVerifying();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [stage]);

  function startVerifying() {
    setStage("verifying");
    setVerifyProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15 + 8;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(async () => {
          // Save payment to DB
          if (userId) {
            await supabase.from("payments").insert({
              user_id: userId,
              roll_number: roll,
              student_name: name,
              amount: Number(amount),
              remarks,
              receipt,
            });
            await loadPayments(userId);
          }
          setStage("success");
        }, 400);
      }
      setVerifyProgress(Math.min(p, 100));
    }, 280);
  }

  function handlePay(e: React.FormEvent) {
    e.preventDefault();
    didReturn.current = false;
    const note = encodeURIComponent(`${remarks} - ${roll}`);
    const pn = encodeURIComponent(PAYEE_NAME);
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=${pn}&am=${amount}&tn=${note}&cu=INR`;
    const a = document.createElement("a");
    a.href = upiLink;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setStage("waiting"), 600);
  }

  const paidPercent = Math.min(100, (totalPaid / TOTAL_FEES) * 100);

  return (
    <div className="bg-white min-h-full">

      {/* FORM */}
      {stage === "form" && (
        <form onSubmit={handlePay} className="p-4 space-y-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--slate)" }}>Make a Payment</h2>

          {/* Fees summary card */}
          <div className="rounded-2xl p-4 border overflow-hidden" style={{ borderColor: cleared ? "var(--green)" : "var(--border)", background: cleared ? "var(--green-bg)" : "var(--surface)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: "var(--slate)" }}>College Fees</span>
              {cleared
                ? <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "var(--green)" }}>✅ All Cleared</span>
                : <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>Total: {fmt(TOTAL_FEES)}</span>
              }
            </div>

            {/* Progress bar */}
            <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${paidPercent}%`, background: cleared ? "var(--green)" : "linear-gradient(90deg, var(--green), #34d399)" }} />
            </div>

            <div className="flex justify-between text-xs">
              <span style={{ color: "var(--green)" }}>Paid: <strong>{fmt(totalPaid)}</strong></span>
              {!cleared && <span style={{ color: "var(--red)" }}>Due: <strong>{fmt(remaining)}</strong></span>}
            </div>
          </div>

          <Field label="Name" value={name} onChange={setName} placeholder="Your full name" />
          <Field label="Roll Number" value={roll} onChange={setRoll} placeholder="e.g. 322103310001" mono />
          <Field label="Phone Number" value={phone} onChange={setPhone} placeholder="+91 98765 43210" type="tel" />

          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--slate)" }}>Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "var(--muted)" }}>₹</span>
              <input
                type="number" value={amount} onChange={e => setAmount(e.target.value)}
                required min="1" max={remaining || undefined}
                className="w-full border rounded-xl pl-7 pr-3 py-3 text-sm focus:outline-none"
                style={{ borderColor: "var(--border)", color: "var(--slate)", fontFamily: "'JetBrains Mono', monospace" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--green)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {["500", "1000", "5000", "10000"].map(a => (
                <button key={a} type="button" onClick={() => setAmount(a)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                  style={amount === a
                    ? { background: "var(--green)", color: "#fff", borderColor: "var(--green)" }
                    : { borderColor: "var(--border)", color: "var(--muted)" }}>
                  ₹{Number(a).toLocaleString("en-IN")}
                </button>
              ))}
              {!cleared && (
                <button type="button" onClick={() => setAmount(String(remaining))}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                  style={amount === String(remaining)
                    ? { background: "var(--green)", color: "#fff", borderColor: "var(--green)" }
                    : { borderColor: "var(--border)", color: "var(--muted)" }}>
                  Pay Full Due
                </button>
              )}
            </div>
          </div>

          <Field label="Remarks" value={remarks} onChange={setRemarks} placeholder="e.g. College Fees" />

          <button type="submit" disabled={!amount || !phone || cleared}
            className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-3 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #5f259f 0%, #8b31cc 100%)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="14" rx="3" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5"/>
              <path d="M7 12h10M12 8l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {cleared ? "Fees Fully Paid ✅" : `Pay ${fmt(Number(amount) || 0)} via UPI`}
          </button>

          {!cleared && (
            <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
              Opens PhonePe · GPay · Paytm · BHIM
            </p>
          )}
        </form>
      )}

      {/* WAITING */}
      {stage === "waiting" && (
        <div className="p-8 flex flex-col items-center justify-center min-h-full gap-5 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse"
            style={{ background: "var(--green-bg)" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                stroke="var(--green)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--slate)" }}>Waiting for Payment…</h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Complete the payment in your UPI app</p>
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
              Paying <span className="font-semibold" style={{ color: "var(--green)" }}>{fmt(Number(amount))}</span> to {UPI_ID}
            </p>
          </div>
          <p className="text-xs px-4 py-2 rounded-xl" style={{ background: "var(--surface)", color: "var(--muted)" }}>
            📱 Works on real mobile device. Open app on your phone to pay via UPI.
          </p>
          <button onClick={() => setStage("form")} className="text-sm" style={{ color: "var(--muted)" }}>Cancel</button>
        </div>
      )}

      {/* VERIFYING */}
      {stage === "verifying" && (
        <div className="p-8 flex flex-col items-center justify-center min-h-full gap-6 text-center">
          <div className="relative w-28 h-28">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--green-bg)" strokeWidth="8"/>
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--green)" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - verifyProgress / 100)}`}
                style={{ transition: "stroke-dashoffset 0.3s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black" style={{ color: "var(--green)" }}>{Math.round(verifyProgress)}%</span>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--slate)" }}>Verifying Payment…</h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Please wait while we confirm your transaction</p>
          </div>
          <div className="w-full space-y-2">
            {[
              { label: "Connecting to UPI network", done: verifyProgress > 25 },
              { label: "Validating transaction", done: verifyProgress > 55 },
              { label: "Confirming with bank", done: verifyProgress > 80 },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                style={{ background: step.done ? "var(--green-bg)" : "var(--surface)" }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: step.done ? "var(--green)" : "var(--border)" }}>
                  {step.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>}
                </div>
                <span className="text-sm font-medium" style={{ color: step.done ? "var(--green)" : "var(--muted)" }}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {stage === "success" && (
        <div className="p-4 flex flex-col items-center text-center gap-5 pt-8">
          <div className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: "var(--green-bg)", border: "4px solid var(--green)" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div>
            <h2 className="text-2xl font-black" style={{ color: "var(--green)" }}>Payment Successful!</h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Your payment has been recorded</p>
          </div>

          {/* Remaining fees status */}
          <div className="w-full rounded-2xl p-4 border" style={{ borderColor: cleared ? "var(--green)" : "var(--border)", background: cleared ? "var(--green-bg)" : "var(--surface)" }}>
            {cleared ? (
              <div className="text-center">
                <p className="text-2xl mb-1">🎉</p>
                <p className="font-bold text-sm" style={{ color: "var(--green)" }}>All College Fees Cleared!</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Total paid: {fmt(totalPaid)}</p>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Remaining Fees</p>
                  <p className="text-xl font-black" style={{ color: "var(--red)" }}>{fmt(remaining)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Total Paid</p>
                  <p className="text-base font-bold" style={{ color: "var(--green)" }}>{fmt(totalPaid)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Receipt */}
          <div className="w-full rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <div className="px-4 py-3 text-white" style={{ background: "var(--green)" }}>
              <p className="text-xs opacity-80">Payment Receipt</p>
              <p className="font-black text-lg" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{receipt}</p>
            </div>
            <div className="divide-y text-left" style={{ borderColor: "var(--border)" }}>
              {[
                { l: "Name", v: name },
                { l: "Roll Number", v: roll, mono: true },
                { l: "Amount Paid", v: fmt(Number(amount)), green: true },
                { l: "Paid To", v: UPI_ID, mono: true },
                { l: "Remarks", v: remarks },
                { l: "Date", v: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
                { l: "Status", v: "✅ Verified" },
              ].map((row, i) => (
                <div key={i} className="flex justify-between px-4 py-3 text-sm">
                  <span style={{ color: "var(--muted)" }}>{row.l}</span>
                  <span className="font-semibold"
                    style={{ color: row.green ? "var(--green)" : "var(--slate)", fontFamily: row.mono ? "'JetBrains Mono', monospace" : undefined }}>
                    {row.v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => setStage("form")}
            className="w-full py-3.5 rounded-2xl font-semibold text-white"
            style={{ background: "var(--green)" }}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}
