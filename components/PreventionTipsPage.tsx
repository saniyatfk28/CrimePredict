import React, { useEffect, useMemo, useState } from "react";
import { computeDistrictStats, getCrimeTypeOptions, getDistrictOptions, loadDataset, titleCase } from "../utils/dataset";

const USER_TIPS_KEY = "crimepredict_user_prevention_tips";

type UserTipsDB = Record<string, string[]>; // crimeType -> tips[]

const DEFAULT_TIPS: Record<string, string[]> = {
  theft: [
    "Keep valuables out of sight in public.",
    "Use strong locks and avoid leaving items unattended.",
    "Be extra careful in crowded areas and on public transport."
  ],
  robbery: [
    "Avoid isolated streets at night and stay in well-lit areas.",
    "Keep emergency contacts ready and don’t resist if threatened.",
    "Use trusted rides and share live location with someone."
  ],
  assault: [
    "Stay in groups when possible, especially at night.",
    "Avoid heated conflicts and leave unsafe situations early.",
    "Report threats early to local authorities."
  ],
  rape: [
    "Share travel plans with trusted people and avoid isolated routes at night.",
    "Use trusted transport and stay aware of surroundings.",
    "Seek immediate help and report incidents; preserve evidence if safe to do so."
  ],
  murder: [
    "Avoid high-risk areas at late hours if alerts suggest danger.",
    "Do not intervene in violent disputes; call emergency services.",
    "Report suspicious activity promptly."
  ],
  kidnap: [
    "Avoid sharing personal routines publicly.",
    "Verify ride/driver details before travel.",
    "Teach family a quick emergency call plan and safe meeting points."
  ],
  bodyfound: [
    "Avoid touching suspicious objects or areas; inform authorities.",
    "If you discover something concerning, keep distance and call emergency services.",
    "Do not spread rumors; share verified information only."
  ],
  unknown: [
    "Stay alert and avoid isolated places at night.",
    "Keep emergency contacts accessible.",
    "Report suspicious activity early."
  ],
  other: [
    "Stay aware of surroundings and trust your instincts.",
    "Keep emergency contacts accessible.",
    "Report suspicious activity early."
  ]
};

function loadUserTips(): UserTipsDB {
  try {
    const raw = localStorage.getItem(USER_TIPS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveUserTips(db: UserTipsDB) {
  localStorage.setItem(USER_TIPS_KEY, JSON.stringify(db));
}

export default function PreventionTipsPage({ role }: { role: "public" | "law" }) {
  const [dataset, setDataset] = useState<any[]>([]);
  const [district, setDistrict] = useState<string>("");
  const [crimeType, setCrimeType] = useState<string>("unknown");
  const [otherCrimeType, setOtherCrimeType] = useState<string>("");

  const [newTip, setNewTip] = useState("");
  const [userTips, setUserTips] = useState<UserTipsDB>(() => loadUserTips());

  useEffect(() => {
    const data = loadDataset();
    setDataset(data);
    // pick a default district
    const districts = getDistrictOptions(data);
    setDistrict(districts[0] || "");
    // default crime type
    const types = getCrimeTypeOptions(data);
    setCrimeType(types.includes("assault") ? "assault" : (types[0] || "unknown"));
  }, []);

  const districts = useMemo(() => getDistrictOptions(dataset), [dataset]);
  const crimeTypes = useMemo(() => getCrimeTypeOptions(dataset), [dataset]);

  const stats = useMemo(() => {
    if (!district) return { total: 0, topTypes: [], risk: "Very Low", mostCommonType: "unknown" as string };
    return computeDistrictStats(dataset, district);
  }, [dataset, district]);

  // If district has no usable data, don't lie. Show fallback, but keep UI working.
  const effectiveCrimeType = crimeType === "other"
    ? (otherCrimeType.trim().toLowerCase() || "other")
    : crimeType;

  const tips = useMemo(() => {
    const base = DEFAULT_TIPS[effectiveCrimeType] || DEFAULT_TIPS.other;
    const extra = userTips[effectiveCrimeType] || [];
    return [...base, ...extra].slice(0, 10);
  }, [effectiveCrimeType, userTips]);

  const onSubmitTip = () => {
    const tip = newTip.trim();
    if (!tip) return;

    const key = effectiveCrimeType || "other";
    const next = { ...userTips } as UserTipsDB;
    next[key] = [...(next[key] || []), tip].slice(-30);
    setUserTips(next);
    saveUserTips(next);
    setNewTip("");

    // try to send to backend; if it fails, we already persisted locally
    (async () => {
      try {
        await fetch('/api/prevention/tips/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ crime_type: key, text: tip, role })
        });
      } catch (err) {
        // network/backend may not be available in dev — that's fine
        console.info('[PreventionTipsPage] backend tips endpoint not available, saved locally');
      }
    })();
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 34, marginBottom: 6 }}>Safety Resources & Prevention Tips</h1>
      <p style={{ color: "#555", marginBottom: 18 }}>
        Recommendations based on your selected district and dataset patterns. (And yes, it actually reads the dataset.)
      </p>

      {/* Controls Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={{ fontWeight: 600 }}>Select District</label>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            style={{ width: "100%", height: 42, marginTop: 8 }}
          >
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <div style={{ marginTop: 8, color: "#777", fontSize: 13 }}>
            {dataset.length ? `Dataset records loaded: ${dataset.length}` : "No dataset loaded. Upload CSV from Admin → Data first."}
          </div>
        </div>

        <div>
          <label style={{ fontWeight: 600 }}>Crime Type</label>
          <select
            value={crimeType}
            onChange={(e) => setCrimeType(e.target.value)}
            style={{ width: "100%", height: 42, marginTop: 8 }}
          >
            {crimeTypes.map(ct => <option key={ct} value={ct}>{titleCase(ct)}</option>)}
          </select>

          {crimeType === "other" && (
            <input
              value={otherCrimeType}
              onChange={(e) => setOtherCrimeType(e.target.value)}
              placeholder="Type a custom crime type (e.g., cybercrime)"
              style={{ width: "100%", height: 42, marginTop: 10, padding: "0 10px" }}
            />
          )}
        </div>

        <div>
          <label style={{ fontWeight: 600 }}>District Risk Level</label>
          <div style={{
            height: 42, marginTop: 8, padding: "0 12px",
            display: "flex", alignItems: "center",
            border: "1px solid #ddd", borderRadius: 6,
            fontWeight: 700
          }}>
            {stats.risk} (incidents: {stats.total})
          </div>
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Top crime types in {district || "…"}</h2>
          {stats.topTypes.length ? (
            <ul>
              {stats.topTypes.map(t => (
                <li key={t.type}>
                  <b>{titleCase(t.type)}</b> — {t.count}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: "#a00" }}>
              No usable district breakdown found in dataset for this district.
              <br />
              (Your dataset likely has missing/invalid district values.)
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Recommended Safety Tips</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {tips.map((t, idx) => (
              <div key={idx} style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 800 }}>Tip {idx + 1}</div>
                <div style={{ marginTop: 6 }}>{t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add user tip */}
      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 16, marginTop: 18 }}>
        <h2 style={{ marginTop: 0 }}>
          Add your own tip (for “{titleCase(effectiveCrimeType)}” in all districts)
        </h2>

        <textarea
          value={newTip}
          onChange={(e) => setNewTip(e.target.value)}
          placeholder="Write a short prevention tip based on your experience (max 500 chars)..."
          maxLength={500}
          style={{ width: "100%", minHeight: 90, padding: 10 }}
        />

        <button
          onClick={onSubmitTip}
          style={{ marginTop: 10, height: 40, padding: "0 14px", cursor: "pointer" }}
        >
          Submit Tip
        </button>
      </div>
    </div>
  );
}
