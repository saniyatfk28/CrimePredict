import React, { useState, useEffect } from 'react';
import { CRIME_TYPES, CRIME_TYPE_DESCRIPTIONS, CRIME_SEVERITY } from '../constants/crimeTypes';
import CrimeFilters from './CrimeFilters';
import TrendChart from './TrendChart';
import CrimeReport from './CrimeReport';

interface CrimeStatistics {
  totalCrimes: number;
  crimeTypeBreakdown: { [key: string]: number };
  crimeByCity: { [key: string]: number };
  crimeByTimeOfDay: { [key: string]: number };
  crimeByMonth: { [key: number]: number };
  crimeByWeekday: { [key: string]: number };
  crimeBySeason: { [key: string]: number };
}

const DATASET_DB_KEY = 'crimepredict_dataset';

const CrimeStatsOverview: React.FC = () => {
  const [stats, setStats] = useState<CrimeStatistics | null>(null);
  const [activeTab, setActiveTab] = useState<'type' | 'city' | 'time' | 'season' | 'trend' | 'report'>('type');
  const [loading, setLoading] = useState(true);
  const [aggregation, setAggregation] = useState<'day' | 'month'>('month');
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [timeSeries, setTimeSeries] = useState<Array<{ x: string; y: number }>>([]);
  const [trendSlope, setTrendSlope] = useState<number | undefined>(undefined);

  useEffect(() => {
    loadAndAnalyzeDataset();
  }, [aggregation, dateFrom, dateTo, selectedTypes]);

  const loadAndAnalyzeDataset = () => {
    try {
      const dataset = JSON.parse(localStorage.getItem(DATASET_DB_KEY) || '[]');
      
      if (dataset.length === 0) {
        setLoading(false);
        return;
      }

      const crimeTypeBreakdown: { [key: string]: number } = {};
      const crimeByCity: { [key: string]: number } = {};
      const crimeByTimeOfDay: { [key: string]: number } = {};
      const crimeByMonth: { [key: number]: number } = {};
      const crimeByWeekday: { [key: string]: number } = {};
      const crimeBySeasonMap: { [key: string]: number } = {};

      // Prepare available types list
      const typesSet = new Set<string>();
      dataset.forEach((r: any) => {
        const t = r.crime || r.crime_type || 'Unknown';
        typesSet.add(t);
      });
      setAvailableTypes(Array.from(typesSet).sort());

      // Apply selected type filter if any
      const filteredDataset = selectedTypes.length > 0 ? dataset.filter((rec: any) => selectedTypes.includes(rec.crime || rec.crime_type || 'Unknown')) : dataset;

      filteredDataset.forEach((record: any) => {
        // Crime type - check both 'crime' and 'crime_type' fields
        const crimeType = record.crime || record.crime_type || 'Unknown';
        crimeTypeBreakdown[crimeType] = (crimeTypeBreakdown[crimeType] || 0) + 1;

        // City (from incident_place)
        const city = record.incident_place || 'Unknown';
        crimeByCity[city] = (crimeByCity[city] || 0) + 1;

        // Time of day
        const timeOfDay = record.part_of_the_day || 'Unknown';
        crimeByTimeOfDay[timeOfDay] = (crimeByTimeOfDay[timeOfDay] || 0) + 1;

        // Month
        const month = record.incident_month || 0;
        crimeByMonth[month] = (crimeByMonth[month] || 0) + 1;

        // Weekday
        const weekday = record.incident_weekday || 'Unknown';
        crimeByWeekday[weekday] = (crimeByWeekday[weekday] || 0) + 1;

        // Season
        const season = record.season || 'Unknown';
        crimeBySeasonMap[season] = (crimeBySeasonMap[season] || 0) + 1;
      });

      setStats({
        totalCrimes: (selectedTypes.length > 0 ? filteredDataset.length : dataset.length),
        crimeTypeBreakdown,
        crimeByCity,
        crimeByTimeOfDay,
        crimeByMonth,
        crimeByWeekday,
        crimeBySeasonMap: crimeBySeasonMap,
      });
      // Build time series (prefer explicit date fields, fall back to incident_month/incident_year)
      const tsMap: { [key: string]: number } = {};
      let builtFrom: 'date' | 'month' = 'date';

      const weekdayNameToIndex = (w: string) => {
        if (!w) return -1;
        const s = String(w).toLowerCase();
        const map: Record<string, number> = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
        return map[s] ?? -1;
      };

      const nthWeekdayOfMonth = (year: number, monthIndex: number, nth: number, weekday: number) => {
        const first = new Date(year, monthIndex, 1);
        let count = 0;
        for (let d = 1; d <= 31; d++) {
          const cur = new Date(year, monthIndex, d);
          if (cur.getMonth() !== monthIndex) break;
          if (cur.getDay() === weekday) {
            count += 1;
            if (count === nth) return cur;
          }
        }
        return null;
      };

      (selectedTypes.length > 0 ? filteredDataset : dataset).forEach((r: any) => {
        const raw = r.incident_date || r.reported_at || r.date || r.incident_datetime;
        if (raw) {
          const d = new Date(raw);
          if (isNaN(d.getTime())) return;
          if (dateFrom && d < new Date(dateFrom)) return;
          if (dateTo && d > new Date(dateTo)) return;
          const key = aggregation === 'day' ? d.toISOString().slice(0,10) : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          tsMap[key] = (tsMap[key] || 0) + 1;
        }
      });

      if (Object.keys(tsMap).length === 0) {
        (selectedTypes.length > 0 ? filteredDataset : dataset).forEach((r: any) => {
          const monRaw = r.incident_month;
          const monNum = monRaw === undefined || monRaw === null || monRaw === '' ? NaN : Number(monRaw);
          if (isNaN(monNum)) return;
          const year = Number(r.incident_year || r.year || r.reported_year || 2026);
          const monthIndex = Math.max(0, Math.min(11, monNum - 1));

          const possibleDayFields = [r.incident_day, r.incident_date_day, r.incident_dom, r.incident_week];
          let dayNum: number | null = null;
          for (const f of possibleDayFields) {
            if (f === undefined || f === null || f === '') continue;
            const n = Number(f);
            if (!isNaN(n) && n >= 1 && n <= 31) { dayNum = n; break; }
          }

          let dateObj: Date | null = null;
          if (dayNum) {
            dateObj = new Date(year, monthIndex, dayNum);
          } else if (r.incident_week && r.incident_weekday) {
            const wk = Number(r.incident_week);
            const wd = weekdayNameToIndex(r.incident_weekday);
            if (!isNaN(wk) && wk >= 1 && wd >= 0) {
              dateObj = nthWeekdayOfMonth(year, monthIndex, wk, wd);
            }
          } else if (r.incident_weekday) {
            const wd = weekdayNameToIndex(r.incident_weekday);
            if (wd >= 0) dateObj = nthWeekdayOfMonth(year, monthIndex, 1, wd);
          }

          if (dateObj && !isNaN(dateObj.getTime())) {
            if (dateFrom && dateObj < new Date(dateFrom)) return;
            if (dateTo && dateObj > new Date(dateTo)) return;
            const key = aggregation === 'day' ? dateObj.toISOString().slice(0,10) : `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}`;
            tsMap[key] = (tsMap[key] || 0) + 1;
            builtFrom = 'date';
          } else {
            const monthStr = String(monNum).padStart(2, '0');
            const key = `${year}-${monthStr}`;
            tsMap[key] = (tsMap[key] || 0) + 1;
            builtFrom = 'month';
          }
        });
      }

      const series = Object.keys(tsMap).sort().map(k => ({ x: k, y: tsMap[k] }));
      setTimeSeries(series);

      if (series.length >= 2) {
        const ys = series.map(s => s.y);
        const n = ys.length;
        const xs = Array.from({ length: n }, (_, i) => i + 1);
        const meanX = xs.reduce((a,b)=>a+b,0)/n;
        const meanY = ys.reduce((a,b)=>a+b,0)/n;
        let num=0, den=0;
        for (let i=0;i<n;i++){
          num += (xs[i]-meanX)*(ys[i]-meanY);
          den += (xs[i]-meanX)**2;
        }
        const slope = den === 0 ? 0 : num/den;
        setTrendSlope(slope);
      } else {
        setTrendSlope(undefined);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error analyzing dataset:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalCrimes === 0) {
    return (
      <div className="alert alert-info rounded-4" role="alert">
        <i className="fas fa-info-circle me-2"></i>
        <strong>No dataset uploaded.</strong> Please upload a crime dataset first to view statistics.
      </div>
    );
  }

  const renderBarChart = (data: { [key: string]: number }, maxHeight: number = 200) => {
    const entries = (Object.entries(data) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxValue = Math.max(...entries.map(e => e[1]));

    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: `${maxHeight}px` }}>
        {entries.map(([label, value]) => (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                height: `${(value / maxValue) * maxHeight * 0.8}px`,
                backgroundColor: '#dc3545',
                borderRadius: '4px 4px 0 0',
                transition: 'all 0.3s ease',
              }}
              title={`${label}: ${value}`}
            />
            <small style={{ marginTop: '8px', fontSize: '11px', textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {label}
            </small>
            <small style={{ fontSize: '10px', color: '#666', fontWeight: 'bold' }}>{value}</small>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-3">
        <CrimeFilters
          availableTypes={availableTypes}
          selectedTypes={selectedTypes}
          onTypesChange={setSelectedTypes}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          aggregation={aggregation}
          onAggregationChange={setAggregation}
        />
      </div>
      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3 rounded-3 bg-danger-subtle">
            <small className="text-muted d-block">Total Crimes in Dataset</small>
            <h3 className="text-danger fw-bold mb-0">{stats.totalCrimes.toLocaleString()}</h3>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3 rounded-3 bg-primary-subtle">
            <small className="text-muted d-block">Crime Types Identified</small>
            <h3 className="text-primary fw-bold mb-0">{Object.keys(stats.crimeTypeBreakdown).length}</h3>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3 rounded-3 bg-info-subtle">
            <small className="text-muted d-block">Cities Affected</small>
            <h3 className="text-info fw-bold mb-0">{Object.keys(stats.crimeByCity).length}</h3>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3 rounded-3 bg-warning-subtle">
            <small className="text-muted d-block">Time Periods Covered</small>
            <h3 className="text-warning fw-bold mb-0">{Object.keys(stats.crimeByTimeOfDay).length}</h3>
          </div>
        </div>
      </div>

      {/* Tabs for different breakdowns */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header bg-white py-3">
          <ul className="nav nav-tabs border-bottom-0" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link fw-bold ${activeTab === 'type' ? 'active text-danger border-danger' : 'text-muted'}`}
                onClick={() => setActiveTab('type')}
              >
                <i className="fas fa-list me-2"></i>Crime Types
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link fw-bold ${activeTab === 'city' ? 'active text-danger border-danger' : 'text-muted'}`}
                onClick={() => setActiveTab('city')}
              >
                <i className="fas fa-city me-2"></i>Cities
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link fw-bold ${activeTab === 'time' ? 'active text-danger border-danger' : 'text-muted'}`}
                onClick={() => setActiveTab('time')}
              >
                <i className="fas fa-clock me-2"></i>Time of Day
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link fw-bold ${activeTab === 'season' ? 'active text-danger border-danger' : 'text-muted'}`}
                onClick={() => setActiveTab('season')}
              >
                <i className="fas fa-leaf me-2"></i>Seasons
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link fw-bold ${activeTab === 'trend' ? 'active text-danger border-danger' : 'text-muted'}`}
                onClick={() => setActiveTab('trend')}
              >
                <i className="fas fa-chart-line me-2"></i>Trend
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link fw-bold ${activeTab === 'report' ? 'active text-danger border-danger' : 'text-muted'}`}
                onClick={() => setActiveTab('report')}
              >
                <i className="fas fa-file-alt me-2"></i>Report
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-4">
          {/* Crime Types Tab */}
          {activeTab === 'type' && (
            <div>
              <h6 className="fw-bold mb-3">Crime Incidents by Type</h6>
              <div style={{ overflowX: 'auto' }}>
                {renderBarChart(stats.crimeTypeBreakdown)}
              </div>
              <div className="mt-4">
                <table className="table table-sm table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Crime Type</th>
                      <th>Description</th>
                      <th>Severity</th>
                      <th className="text-end">Count</th>
                      <th className="text-end">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.entries(stats.crimeTypeBreakdown) as [string, number][])
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => {
                        const severity = CRIME_SEVERITY[type as keyof typeof CRIME_SEVERITY] || 'medium';
                        const description = CRIME_TYPE_DESCRIPTIONS[type as keyof typeof CRIME_TYPE_DESCRIPTIONS] || type;
                        const severityColor = severity === 'high' ? 'danger' : severity === 'medium' ? 'warning' : 'info';
                        
                        return (
                          <tr key={type}>
                            <td className="fw-bold">{type.charAt(0).toUpperCase() + type.slice(1)}</td>
                            <td><small className="text-muted">{description}</small></td>
                            <td>
                              <span className={`badge bg-${severityColor} text-capitalize`}>{severity}</span>
                            </td>
                            <td className="text-end fw-bold">{count}</td>
                            <td className="text-end">{((count / stats.totalCrimes) * 100).toFixed(2)}%</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cities Tab */}
          {activeTab === 'city' && (
            <div>
              <h6 className="fw-bold mb-3">Crime Incidents by City</h6>
              <div style={{ overflowX: 'auto' }}>
                {renderBarChart(stats.crimeByCity)}
              </div>
              <div className="mt-4">
                <table className="table table-sm table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>City</th>
                      <th className="text-end">Count</th>
                      <th className="text-end">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.entries(stats.crimeByCity) as [string, number][])
                      .sort((a, b) => b[1] - a[1])
                      .map(([city, count]) => (
                        <tr key={city}>
                          <td>{city}</td>
                          <td className="text-end fw-bold">{count}</td>
                          <td className="text-end">{((count / stats.totalCrimes) * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Time of Day Tab */}
          {activeTab === 'time' && (
            <div>
              <h6 className="fw-bold mb-3">Crime Incidents by Time of Day</h6>
              <div style={{ overflowX: 'auto' }}>
                {renderBarChart(stats.crimeByTimeOfDay)}
              </div>
              <div className="mt-4">
                <table className="table table-sm table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Time Period</th>
                      <th className="text-end">Count</th>
                      <th className="text-end">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.entries(stats.crimeByTimeOfDay) as [string, number][])
                      .sort((a, b) => b[1] - a[1])
                      .map(([time, count]) => (
                        <tr key={time}>
                          <td>{time}</td>
                          <td className="text-end fw-bold">{count}</td>
                          <td className="text-end">{((count / stats.totalCrimes) * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Seasons Tab */}
          {activeTab === 'season' && (
            <div>
              <h6 className="fw-bold mb-3">Crime Incidents by Season</h6>
              <div style={{ overflowX: 'auto' }}>
                {renderBarChart(stats.crimeBySeasonMap)}
              </div>
              <div className="mt-4">
                <table className="table table-sm table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Season</th>
                      <th className="text-end">Count</th>
                      <th className="text-end">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.entries(stats.crimeBySeasonMap) as [string, number][])
                      .sort((a, b) => b[1] - a[1])
                      .map(([season, count]) => (
                        <tr key={season}>
                          <td>{season}</td>
                          <td className="text-end fw-bold">{count}</td>
                          <td className="text-end">{((count / stats.totalCrimes) * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'trend' && (
            <div>
              <h6 className="fw-bold mb-3">Crime Trend ({timeSeries.length > 0 && timeSeries[0].x.startsWith('month-') ? 'Monthly (month-only)' : (aggregation === 'day' ? 'Daily' : 'Monthly')})</h6>
              {timeSeries.length <= 1 ? (
                <div className="alert alert-info">Not enough time-series data available for trend visualization.</div>
              ) : (
                <TrendChart series={timeSeries} forecastPoints={aggregation === 'day' ? 14 : 6} />
              )}
            </div>
          )}

          {activeTab === 'report' && (
            <div>
                <CrimeReport
                total={stats.totalCrimes}
                topTypes={(Object.entries(stats.crimeTypeBreakdown) as [string, number][]).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([type,count])=>({type,count}))}
                topCities={(Object.entries(stats.crimeByCity) as [string, number][]).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([city,count])=>({city,count}))}
                trendSlope={trendSlope}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrimeStatsOverview;
