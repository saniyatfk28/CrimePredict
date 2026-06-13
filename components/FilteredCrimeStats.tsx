import React, { useState, useEffect, useRef } from 'react';
import { CRIME_TYPE_DESCRIPTIONS, CRIME_SEVERITY } from '../constants/crimeTypes';
import CrimeFilters from './CrimeFilters';
import TrendChart from './TrendChart';
import CrimeReport from './CrimeReport';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Overlay from 'ol/Overlay';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import { fromLonLat } from 'ol/proj';

interface CrimeStatistics {
  totalCrimes: number;
  crimeTypeBreakdown: { [key: string]: number };
  crimeByCity: { [key: string]: number };
  crimeByTimeOfDay: { [key: string]: number };
  crimeByMonth: { [key: number]: number };
  crimeByWeekday: { [key: string]: number };
  crimeBySeasonMap: { [key: string]: number };
}

const DATASET_DB_KEY = 'crimepredict_dataset';

interface FilteredCrimeStatsProps {
  districtFilter?: string;
  showDistrictInfo?: boolean;
}

const FilteredCrimeStats: React.FC<FilteredCrimeStatsProps> = ({ districtFilter, showDistrictInfo = true }) => {
  const [stats, setStats] = useState<CrimeStatistics | null>(null);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);
  const [aggregation, setAggregation] = useState<'day' | 'month'>('day');
  const [activeTab, setActiveTab] = useState<'type' | 'city' | 'time' | 'season' | 'trend' | 'report'>('type');
  const [loading, setLoading] = useState(true);
  const [filteredRecordCount, setFilteredRecordCount] = useState(0);
  const [timeSeries, setTimeSeries] = useState<Array<{ x: string; y: number }>>([]);
  const [trendSlope, setTrendSlope] = useState<number | undefined>(undefined);
  const [selectedCrimeForMap, setSelectedCrimeForMap] = useState<string | null>(null);
  const [cityGeo, setCityGeo] = useState<Record<string, { lat: number; lon: number; total: number; byType: Record<string, number> }>>({});

  useEffect(() => {
    loadAndAnalyzeDataset();
  }, [districtFilter, selectedTypes, dateFrom, dateTo, aggregation]);

  const loadAndAnalyzeDataset = () => {
    try {
      const dataset = JSON.parse(localStorage.getItem(DATASET_DB_KEY) || '[]');
      
      // Prepare available crime types
      const typesSet = new Set<string>();
      dataset.forEach((r: any) => {
        const t = r.crime || r.crime_type || 'Unknown';
        typesSet.add(t);
      });
      setAvailableTypes(Array.from(typesSet).sort());

      // Apply filters
      let filteredData = dataset;
      if (districtFilter) {
        filteredData = filteredData.filter((record: any) => 
          record.incident_district && record.incident_district.toLowerCase() === districtFilter.toLowerCase()
        );
      }
      if (selectedTypes.length > 0) {
        filteredData = filteredData.filter((r: any) => selectedTypes.includes(r.crime || r.crime_type || 'Unknown'));
      }
      if (dateFrom || dateTo) {
        filteredData = filteredData.filter((r: any) => {
          const dStr = r.incident_date || r.reported_at || r.date || r.incident_datetime;
          if (!dStr) return false;
          const d = new Date(dStr);
          if (isNaN(d.getTime())) return false;
          if (dateFrom && d < new Date(dateFrom)) return false;
          if (dateTo && d > new Date(dateTo)) return false;
          return true;
        });
      }

      setFilteredRecordCount(filteredData.length);

      if (filteredData.length === 0) {
        setLoading(false);
        return;
      }

      const crimeTypeBreakdown: { [key: string]: number } = {};
      const crimeByCity: { [key: string]: number } = {};
      const crimeByTimeOfDay: { [key: string]: number } = {};
      const crimeByMonth: { [key: number]: number } = {};
      const crimeByWeekday: { [key: string]: number } = {};
      const crimeBySeasonMap: { [key: string]: number } = {};

      filteredData.forEach((record: any) => {
        // Crime type
        const crimeType = record.crime || record.crime_type || 'Unknown';
        crimeTypeBreakdown[crimeType] = (crimeTypeBreakdown[crimeType] || 0) + 1;

        // City (from incident_place)
        const city = record.incident_place || 'Unknown';
        crimeByCity[city] = (crimeByCity[city] || 0) + 1;

        // Geo aggregation (latitude/longitude may exist on records)
        const lat = record.latitude !== undefined ? Number(record.latitude) : (record.lat !== undefined ? Number(record.lat) : NaN);
        const lon = record.longitude !== undefined ? Number(record.longitude) : (record.lng !== undefined ? Number(record.lng) : NaN);

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

      // Build city geo info (average lat/lon and per-type counts)
      const geoMap: Record<string, { latSum: number; lonSum: number; total: number; byType: Record<string, number> }> = {};
      filteredData.forEach((r: any) => {
        const city = r.incident_place || 'Unknown';
        const lat = r.latitude !== undefined ? Number(r.latitude) : (r.lat !== undefined ? Number(r.lat) : NaN);
        const lon = r.longitude !== undefined ? Number(r.longitude) : (r.lng !== undefined ? Number(r.lng) : NaN);
        if (!geoMap[city]) geoMap[city] = { latSum: 0, lonSum: 0, total: 0, byType: {} };
        if (!isNaN(lat)) { geoMap[city].latSum += lat; }
        if (!isNaN(lon)) { geoMap[city].lonSum += lon; }
        geoMap[city].total += 1;
        const crimeType = r.crime || r.crime_type || 'Unknown';
        geoMap[city].byType[crimeType] = (geoMap[city].byType[crimeType] || 0) + 1;
      });

      const geoResult: Record<string, { lat: number; lon: number; total: number; byType: Record<string, number> }> = {};
      Object.entries(geoMap).forEach(([city, v]) => {
        const avgLat = v.latSum === 0 ? NaN : v.latSum / v.total;
        const avgLon = v.lonSum === 0 ? NaN : v.lonSum / v.total;
        geoResult[city] = { lat: isNaN(avgLat) ? 0 : avgLat, lon: isNaN(avgLon) ? 0 : avgLon, total: v.total, byType: v.byType };
      });
      setCityGeo(geoResult);

      setStats({
        totalCrimes: filteredData.length,
        crimeTypeBreakdown,
        crimeByCity,
        crimeByTimeOfDay,
        crimeByMonth,
        crimeByWeekday,
        crimeBySeasonMap,
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
        // nth: 1..5, weekday: 0..6
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

      filteredData.forEach((r: any) => {
        const raw = r.incident_date || r.reported_at || r.date || r.incident_datetime;
        if (raw) {
          const d = new Date(raw);
          if (isNaN(d.getTime())) return;
          const key = aggregation === 'day' ? d.toISOString().slice(0,10) : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          tsMap[key] = (tsMap[key] || 0) + 1;
        }
      });

      // If no keys built from explicit dates, try to synthesize date from month/week/day fields
      if (Object.keys(tsMap).length === 0) {
        filteredData.forEach((r: any) => {
          const monRaw = r.incident_month;
          const monNum = monRaw === undefined || monRaw === null || monRaw === '' ? NaN : Number(monRaw);
          if (isNaN(monNum)) return;
          const year = Number(r.incident_year || r.year || r.reported_year || 2026);
          const monthIndex = Math.max(0, Math.min(11, monNum - 1));

          // prefer day-of-month fields if present (incident_week may be day)
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
            // week-of-month (1..5) and weekday name
            const wk = Number(r.incident_week);
            const wd = weekdayNameToIndex(r.incident_weekday);
            if (!isNaN(wk) && wk >= 1 && wd >= 0) {
              dateObj = nthWeekdayOfMonth(year, monthIndex, wk, wd);
            }
          } else if (r.incident_weekday) {
            // try to pick first weekday occurrence in month
            const wd = weekdayNameToIndex(r.incident_weekday);
            if (wd >= 0) dateObj = nthWeekdayOfMonth(year, monthIndex, 1, wd);
          }

          if (dateObj && !isNaN(dateObj.getTime())) {
            const key = aggregation === 'day' ? dateObj.toISOString().slice(0,10) : `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}`;
            tsMap[key] = (tsMap[key] || 0) + 1;
            builtFrom = 'date';
          } else {
            // fallback to month-only key
            const monthStr = String(monNum).padStart(2, '0');
            const key = `${year}-${monthStr}`;
            tsMap[key] = (tsMap[key] || 0) + 1;
            builtFrom = 'month';
          }
        });
      }

      // Build series and exposure (days observed) map
      const observedDaysMap: { [key: string]: Set<string> } = {};
      // If aggregation is month, we want to count how many distinct days in that month were observed
      if (aggregation === 'month') {
        filteredData.forEach((r: any) => {
          const raw = r.incident_date || r.reported_at || r.date || r.incident_datetime;
          if (!raw) return;
          const d = new Date(raw);
          if (isNaN(d.getTime())) return;
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const dayKey = d.toISOString().slice(0, 10);
          if (!observedDaysMap[monthKey]) observedDaysMap[monthKey] = new Set();
          observedDaysMap[monthKey].add(dayKey);
        });
      }

      let series = Object.keys(tsMap).sort().map(k => {
        const exposure = aggregation === 'month' ? (observedDaysMap[k] ? observedDaysMap[k].size : new Date(Number(k.split('-')[0]), Number(k.split('-')[1]) - 1, 0).getDate()) : 1;
        return { x: k, y: tsMap[k], exposure };
      });

      // If aggregating by month, drop partial first/last months to avoid misleading trends
      if (aggregation === 'month' && series.length > 0) {
        // helper to parse YYYY-MM
        const parseYM = (s: string) => {
          const parts = s.split('-');
          const y = Number(parts[0]);
          const m = Number(parts[1]) - 1;
          return { y, m };
        };

        // drop first month if dateFrom falls inside that month (partial)
        if (dateFrom) {
          const first = series[0].x;
          const { y, m } = parseYM(first);
          const df = new Date(dateFrom);
          if (df.getFullYear() === y && df.getMonth() === m && df.getDate() > 1) {
            series = series.slice(1);
          }
        }

        // drop last month if dateTo is not end-of-month (partial) or if dateTo not provided and current month is last (partial)
        if (series.length > 0) {
          const last = series[series.length - 1].x;
          const { y: ly, m: lm } = parseYM(last);
          const daysInMonth = new Date(ly, lm + 1, 0).getDate();

          if (dateTo) {
            const dt = new Date(dateTo);
            if (dt.getFullYear() === ly && dt.getMonth() === lm && dt.getDate() < daysInMonth) {
              series = series.slice(0, -1);
            }
          } else {
            const now = new Date();
            if (now.getFullYear() === ly && now.getMonth() === lm && now.getDate() < daysInMonth) {
              series = series.slice(0, -1);
            }
          }
        }
      }

      setTimeSeries(series);

      // Compute simple trend slope (linear regression on values)
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

  const renderBarChart = (data: { [key: string]: number }, maxHeight: number = 200) => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);
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

  const renderCityHeatmap = (crimeType: string | null) => {
    // Map container (MapLibre will render into this div via effect below)
    return (
      <div>
        <div ref={mapContainerRef} style={{ width: '100%', height: 420, borderRadius: 8, overflow: 'hidden' }} />
        <div className="mt-2 small text-muted">Showing probabilities P({crimeType || 'selected crime'} | City) computed from dataset (Naive Bayes / empirical conditional)</div>
      </div>
    );
  };

  // OpenLayers refs and initialization
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Build OL features from cityGeo
    const entries = Object.entries(cityGeo) as [string, { lat: number; lon: number; total: number; byType: Record<string, number> }][];
    const olFeatures: any[] = entries
      .filter(([_, v]) => v && v.lat && v.lon)
      .map(([city, v]) => {
        let crimeCount = 0;
        if (selectedCrimeForMap) {
          for (const [k, cnt] of Object.entries(v.byType || {})) {
            if (String(k).toLowerCase() === String(selectedCrimeForMap).toLowerCase()) crimeCount += Number(cnt as any) || 0;
          }
        }
        const totalAll = (Object.values(cityGeo) as Array<{ total: number }>).reduce((s, vv) => s + (vv.total || 0), 0) || 1;
        // Laplace smoothing (add-one) for P(crime | city)
        const alpha = 1;
        const K = Math.max(1, availableTypes.length || Object.keys(v.byType || {}).length);
        let prob: number;
        if (selectedCrimeForMap) {
          prob = (crimeCount + alpha) / (v.total + alpha * K);
        } else {
          prob = v.total / totalAll;
        }

        const feat = new Feature({
          geometry: new Point(fromLonLat([v.lon, v.lat])),
          city,
          total: v.total,
          crimeCount,
          prob,
        });

        const radius = Math.max(6, Math.min(20, prob * 20));
        const opacity = 0.25 + Math.max(0, Math.min(1, prob)) * 0.75;
        feat.setStyle(
          new Style({
            image: new CircleStyle({
              radius,
              fill: new Fill({ color: `rgba(220,53,69,${opacity})` }),
              stroke: new Stroke({ color: '#7a0b12', width: 0.6 }),
            }),
          })
        );

        return feat;
      });

    if (!mapRef.current) {
      const vectorSource = new VectorSource({ features: olFeatures });
      const vectorLayer = new VectorLayer({ source: vectorSource });

      const map = new Map({
        target: mapContainerRef.current,
        layers: [
          new TileLayer({ source: new OSM() }),
          vectorLayer,
        ],
        view: new View({ center: fromLonLat([90.3563, 23.6850]), zoom: 6 }),
      });

      // Popup overlay
      const popupContainer = document.createElement('div');
      popupContainer.className = 'ol-popup';
      popupContainer.style.background = 'white';
      popupContainer.style.padding = '6px 8px';
      popupContainer.style.borderRadius = '4px';
      popupContainer.style.boxShadow = '0 1px 6px rgba(0,0,0,0.3)';
      const overlay = new Overlay({ element: popupContainer, autoPan: true, offset: [0, -10] });
      map.addOverlay(overlay);

      map.on('singleclick', (evt: any) => {
        const feature = map.forEachFeatureAtPixel(evt.pixel, (f: any) => f);
        if (feature) {
          const props = feature.getProperties();
          const coord = (props.geometry as Point).getCoordinates();
          const prob = Number(props.prob) || 0;
          popupContainer.innerHTML = `<strong>${props.city}</strong><br/>Prob: ${prob.toFixed(4)}`;
          overlay.setPosition(coord);
        } else {
          overlay.setPosition(undefined);
        }
      });

      mapRef.current = { map, vectorLayer, overlay };
    } else {
      // Update existing vector source
      const { vectorLayer } = mapRef.current;
      const src = vectorLayer.getSource();
      src.clear();
      src.addFeatures(olFeatures as any);
    }

    // cleanup on unmount
    return () => {
      // keep map instance to preserve state across updates; full cleanup handled on component unmount by OL when target removed
    };
  }, [cityGeo, selectedCrimeForMap, availableTypes]);

  // Programmatically focus a city on the map and show popup
  const focusCity = (cityName: string) => {
    if (!mapRef.current) return;
    const { map, vectorLayer, overlay } = mapRef.current;
    const src = vectorLayer.getSource();
    const feats = src.getFeatures();
    const feat = feats.find((f: any) => String(f.get('city')) === String(cityName));
    if (!feat) return;
    const geom = feat.getGeometry();
    if (!geom) return;
    const coord = geom.getCoordinates();
    const view = map.getView();
    try {
      view.animate({ center: coord, zoom: Math.max(view.getZoom() || 6, 8), duration: 600 });
    } catch (e) {
      view.setCenter(coord);
    }
    const props = feat.getProperties();
    const el = overlay.getElement && overlay.getElement();
    if (el && (el as HTMLElement).innerHTML !== undefined) {
      const prob = Number(props.prob) || 0;
      (el as HTMLElement).innerHTML = `<strong>${props.city}</strong><br/>Prob: ${prob.toFixed(4)}`;
    }
    overlay.setPosition(coord);
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
        <strong>No data available.</strong> {districtFilter ? `No incidents found in ${districtFilter}.` : 'Please upload a crime dataset first.'}
      </div>
    );
  }

  return (
    <div>
      {/** display aggregation label - prefer detected series format when fallback used */}
      {/** compute displayAgg here so JSX below can reference it */}
      {/* no-op: displayAgg computed inline in JSX where used */}
      {/* Filters */}
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
      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3 rounded-3 bg-danger-subtle">
            <small className="text-muted d-block">Total Crimes</small>
            <h3 className="text-danger fw-bold mb-0">{stats.totalCrimes.toLocaleString()}</h3>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3 rounded-3 bg-primary-subtle">
            <small className="text-muted d-block">Crime Types</small>
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
            <small className="text-muted d-block">Time Periods</small>
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
                          <tr key={type} style={{ cursor: 'pointer' }} onClick={() => { setSelectedCrimeForMap(type); setActiveTab('city'); }}>
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

          {/* Divisions Tab */}
          {activeTab === 'city' && (
            <div>
              <h6 className="fw-bold mb-3">Crime Incidents by City</h6>
              <div style={{ overflowX: 'auto' }}>
                {renderBarChart(stats.crimeByCity)}
              </div>
              <div className="mt-3">
                <small className="text-muted">Quick map — select a crime type to highlight cities by probability.</small>
                <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                  {[...availableTypes].map((t) => (
                    <button
                      key={t}
                      className={
                        selectedCrimeForMap === t ? 'btn btn-sm btn-danger' : 'btn btn-sm btn-outline-secondary'
                      }
                      onClick={() => setSelectedCrimeForMap(selectedCrimeForMap === t ? null : t)}
                      style={{ cursor: 'pointer' }}
                      aria-pressed={selectedCrimeForMap === t}
                    >
                      {t}
                    </button>
                  ))}
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedCrimeForMap(null)}>Clear</button>
                </div>

                <div className="card border-0 shadow-sm p-3 rounded-3 mt-3">
                  <div className="mb-2">
                    <strong className="small">Map: City probabilities</strong>
                  </div>
                  {renderCityHeatmap(selectedCrimeForMap)}
                  <div className="d-flex align-items-center justify-content-end gap-2 mt-2">
                    <small className="text-muted">Low</small>
                    <div style={{ width: 140, height: 10, borderRadius: 4, background: 'linear-gradient(90deg, rgba(220,53,69,0.25), rgba(220,53,69,1))', boxShadow: 'inset 0 0 6px rgba(0,0,0,0.06)' }} />
                    <small className="text-muted">High</small>
                  </div>
                </div>
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
                        <tr key={city} style={{ cursor: 'pointer' }} onClick={() => focusCity(city)}>
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

          {/* Trend Tab */}
          {activeTab === 'trend' && (
            <div>
              <h6 className="fw-bold mb-3">Crime Trend ({timeSeries.length > 0 && timeSeries[0].x.startsWith('month-') ? 'Monthly (month-only)' : (aggregation === 'day' ? 'Daily' : 'Monthly')})</h6>
              {timeSeries.length <= 1 ? (
                <div className="alert alert-info">Not enough time-series data available for trend visualization.</div>
              ) : (
                <>
                  <TrendChart series={timeSeries} forecastPoints={aggregation === 'day' ? 14 : 6} />
                  <div className="mt-2 alert alert-warning small mb-0">
                    <strong>Note:</strong> Projections are indicative trends only and should not be interpreted as precise or reliable predictions.
                  </div>
                </>
              )}
            </div>
          )}

          {/* Report Tab */}
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

export default FilteredCrimeStats;
