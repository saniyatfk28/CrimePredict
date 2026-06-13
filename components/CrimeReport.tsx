import React from 'react';

interface ReportProps {
  total: number;
  topTypes: Array<{ type: string; count: number }>;
  topCities: Array<{ city: string; count: number }>;
  trendSlope?: number;
}

const CrimeReport: React.FC<ReportProps> = ({ total, topTypes, topCities, trendSlope }) => {
  const trendText = typeof trendSlope === 'number' ? (trendSlope > 0 ? 'increasing' : trendSlope < 0 ? 'decreasing' : 'stable') : 'insufficient data';

  return (
    <div>
      <h5 className="fw-bold">Auto-generated Summary</h5>
      <p className="text-muted">This report summarizes the selected dataset and highlights key trends.</p>

      <div className="mb-3">
        <strong>Total incidents:</strong> <span className="ms-2">{total.toLocaleString()}</span>
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card p-3 shadow-sm">
            <strong>Top Crime Types</strong>
            <table className="table table-sm mt-2 mb-0">
              <tbody>
                {topTypes.map(t => (
                  <tr key={t.type}>
                    <td>{t.type}</td>
                    <td className="text-end fw-bold">{t.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card p-3 shadow-sm">
            <strong>Top Cities</strong>
            <table className="table table-sm mt-2 mb-0">
              <tbody>
                {topCities.map(c => (
                  <tr key={c.city}>
                    <td>{c.city}</td>
                    <td className="text-end fw-bold">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <strong>Trend summary:</strong>
        <p className="mb-0">Overall trend is <span className="fw-bold text-capitalize">{trendText}</span>.</p>
      </div>
    </div>
  );
};

export default CrimeReport;
