import React, { useMemo, useState } from "react";
import { UserRole } from "../types";
import {
  loadDatasetRows,
  computeDistrictInsight,
  getTopDistricts,
} from "../utils/safetyInsights";

type Props = {
  role: UserRole;
  userDistrict?: string;
};

const TIPS: Record<string, string[]> = {
  Theft: [
    "Keep valuables in zipped bags. Avoid back pockets.",
    "Do not use phone openly in crowded areas.",
    "Use well-lit routes and stay aware at intersections.",
  ],
  Robbery: [
    "Avoid isolated roads at night. Prefer busy routes.",
    "Do not resist if threatened. Move to safety and report.",
    "Use secure transport and avoid cash withdrawals in quiet places.",
  ],
  Assault: [
    "Avoid arguments with strangers. De-escalate and leave early.",
    "Stay in groups if possible at night.",
    "Share your route and keep emergency contact ready.",
  ],
  Murder: [
    "Report repeated threats early, don’t ‘wait it out’.",
    "Avoid involvement in disputes and risky gatherings.",
    "Encourage community watch and quick reporting.",
  ],
  Rape: [
    "Prefer trusted transport. Share live location with trusted contact.",
    "Avoid isolated places at night. Stay in well-lit areas.",
    "Seek immediate help if unsafe; contact emergency services.",
  ],
  Unknown: [
    "Stay aware of surroundings and avoid isolated routes at night.",
    "Keep emergency contact accessible.",
    "Report suspicious activity early.",
  ],
};

const normalizeType = (t: string) => {
  const key = t.trim();
  if (TIPS[key]) return key;
  const lower = key.toLowerCase();
  if (lower.includes("theft")) return "Theft";
  if (lower.includes("rob")) return "Robbery";
  if (lower.includes("assa")) return "Assault";
  if (lower.includes("rape")) return "Rape";
  if (lower.includes("murder") || lower.includes("homic")) return "Murder";
  return "Unknown";
};

const SafetyRecommendations: React.FC<Props> = ({ role, userDistrict }) => {
  const rows = useMemo(() => loadDatasetRows(), []);
  const topDistricts = useMemo(() => getTopDistricts(rows, 8), [rows]);

  const [district, setDistrict] = useState<string>(
    userDistrict || (topDistricts[0]?.district ?? "Dhaka")
  );

  const insight = useMemo(() => computeDistrictInsight(district, rows), [district, rows]);

  const topType = insight.topCrimeTypes[0]?.type ?? "Unknown";
  const tips = TIPS[normalizeType(topType)] ?? TIPS.Unknown;

  const showDistrictPicker = role === UserRole.LAW_ENFORCEMENT || !userDistrict;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
        <div>
          <h2 className="fw-bold text-danger m-0">Safety Resources & Prevention Tips</h2>
          <p className="text-muted m-0">
            Recommendations based on your district’s crime pattern from the dataset.
          </p>
        </div>
        <span className="badge bg-dark">
          {role === UserRole.LAW_ENFORCEMENT ? "Law Enforcement View" : "Public User View"}
        </span>
      </div>

      <div className="row g-3 mt-3">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3">Area Selection</h5>

              {showDistrictPicker ? (
                <>
                  <label className="small fw-bold text-muted mb-1">Select District</label>
                  <select
                    className="form-select"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  >
                    {topDistricts.map((d) => (
                      <option key={d.district} value={d.district}>
                        {d.district} ({d.total})
                      </option>
                    ))}
                  </select>
                  <div className="small text-muted mt-2">
                    Showing top districts from dataset. Upload data if list looks wrong.
                  </div>
                </>
              ) : (
                <div className="p-3 bg-light rounded-3">
                  <div className="small text-muted">Your district</div>
                  <div className="fw-bold">{district}</div>
                </div>
              )}

              <hr />

              <div className="d-flex justify-content-between">
                <div>
                  <div className="small text-muted">Total incidents</div>
                  <div className="fw-bold">{insight.total.toLocaleString()}</div>
                </div>
                <div className="text-end">
                  <div className="small text-muted">Risk level</div>
                  <div className={`fw-bold ${insight.riskLevel === "High" ? "text-danger" : insight.riskLevel === "Medium" ? "text-warning" : "text-success"}`}>
                    {insight.riskLevel}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="small text-muted">Top crime types</div>
                <ul className="mt-2 mb-0">
                  {insight.topCrimeTypes.slice(0, 3).map((t) => (
                    <li key={t.type}>
                      <span className="fw-bold">{t.type}</span> ({t.count})
                    </li>
                  ))}
                  {insight.topCrimeTypes.length === 0 && <li>No crime types found for this district.</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <h5 className="fw-bold">Recommended Safety Tips</h5>
              <p className="text-muted mb-3">
                Based on the most common incident type: <span className="fw-bold">{topType}</span>
              </p>

              <div className="row g-3">
                {tips.map((tip, idx) => (
                  <div key={idx} className="col-md-6">
                    <div className="p-3 border rounded-4 h-100">
                      <div className="fw-bold mb-1">Tip {idx + 1}</div>
                      <div className="text-muted">{tip}</div>
                    </div>
                  </div>
                ))}
              </div>

              {role === UserRole.LAW_ENFORCEMENT && (
                <>
                  <hr />
                  <h5 className="fw-bold">Law Enforcement Recommendations</h5>
                  <ul className="text-muted">
                    <li>Increase patrol frequency during peak incident hours (based on your analytics module).</li>
                    <li>Run targeted awareness programs in hotspots for the top 2 crime types.</li>
                    <li>Coordinate with community leaders in high-risk areas to improve reporting speed.</li>
                  </ul>
                </>
              )}
            </div>
          </div>

          {rows.length === 0 && (
            <div className="alert alert-warning mt-3 rounded-3">
              Dataset not found in localStorage. Upload dataset first from Admin Data Upload.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SafetyRecommendations;
