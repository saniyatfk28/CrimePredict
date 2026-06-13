import React from 'react';

interface Point { x: string; y: number; exposure?: number }

interface TrendChartProps {
  series: Point[]; // sorted by x (date string)
  forecastPoints?: number;
}

// Simple linear regression to forecast next N steps (on index)
// Returns forecasts (rounded ints as before) plus regression diagnostics for bands
const linearRegressionForecast = (values: number[], steps: number) => {
  const n = values.length;
  if (n === 0) return { forecasts: [] as number[], slope: 0, intercept: 0, residuals: [] as number[], sigma: 0 };
  const xs = Array.from({ length: n }, (_, i) => i + 1);
  const ys = values;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  const residuals = ys.map((y, i) => y - (intercept + slope * xs[i]));
  const rss = residuals.reduce((a, b) => a + b * b, 0);
  const sigma = n > 1 ? Math.sqrt(rss / (n - 1)) : 0;

  const forecasts: number[] = [];
  for (let s = 1; s <= steps; s++) {
    const xi = n + s;
    forecasts.push(Math.max(0, Math.round(intercept + slope * xi)));
  }
  return { forecasts, slope, intercept, residuals, sigma, meanX, denom: den, n };
};

// Fit Poisson GLM with log link and optional exposure (offset = log(exposure)).
// Also estimate Negative-Binomial dispersion parameter alpha and return NB forecasts if requested.
const glmForecast = (values: number[], exposures: number[] | undefined, steps: number, family: 'poisson' | 'nb' = 'poisson') => {
  const n = values.length;
  if (n === 0) return { forecasts: [] as number[], mu: [] as number[] };

  // design matrix X: intercept + time index
  const X: number[][] = Array.from({ length: n }, (_, i) => [1, i + 1]);
  const y = values.slice();
  const offset = exposures ? exposures.map(e => Math.log(Math.max(1e-6, e))) : Array(n).fill(0);

  // initialize beta via linear regression on log(y/exposure + 1e-3)
  const z = y.map((yi, i) => Math.log((yi + 0.1) / Math.exp(offset[i])));
  const xs = X.map(r => r[1]);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanZ = z.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - meanX) * (z[i] - meanZ); den += (xs[i] - meanX) ** 2; }
  let beta0 = meanZ - (den === 0 ? 0 : num / den) * meanX;
  let beta1 = den === 0 ? 0 : num / den;
  let beta = [beta0, beta1];

  // IRLS for Poisson
  for (let iter = 0; iter < 25; iter++) {
    const eta = X.map((row, i) => beta[0] + beta[1] * row[1] + offset[i]);
    const mu = eta.map(e => Math.max(1e-8, Math.exp(e)));
    const W = mu.map(m => m);
    // compute z-star
    const zstar = y.map((yi, i) => (eta[i] + (yi - mu[i]) / Math.max(1e-8, mu[i])));
    // weighted least squares update: beta = (X' W X)^{-1} X' W zstar
    let XTWX = [[0, 0], [0, 0]];
    let XTWz = [0, 0];
    for (let i = 0; i < n; i++) {
      const w = W[i];
      XTWX[0][0] += w * X[i][0] * X[i][0];
      XTWX[0][1] += w * X[i][0] * X[i][1];
      XTWX[1][0] += w * X[i][1] * X[i][0];
      XTWX[1][1] += w * X[i][1] * X[i][1];
      XTWz[0] += w * X[i][0] * zstar[i];
      XTWz[1] += w * X[i][1] * zstar[i];
    }
    // invert 2x2
    const det = XTWX[0][0] * XTWX[1][1] - XTWX[0][1] * XTWX[1][0];
    if (Math.abs(det) < 1e-12) break;
    const inv = [[XTWX[1][1] / det, -XTWX[0][1] / det], [-XTWX[1][0] / det, XTWX[0][0] / det]];
    const newBeta0 = inv[0][0] * XTWz[0] + inv[0][1] * XTWz[1];
    const newBeta1 = inv[1][0] * XTWz[0] + inv[1][1] * XTWz[1];
    const diff = Math.abs(newBeta0 - beta[0]) + Math.abs(newBeta1 - beta[1]);
    beta = [newBeta0, newBeta1];
    if (diff < 1e-6) break;
  }

  // fitted values
  const etaF = X.map((row, i) => beta[0] + beta[1] * row[1] + offset[i]);
  const muF = etaF.map(e => Math.exp(e));

  // estimate NB dispersion alpha by method of moments: Var(y) = mu + alpha * mu^2
  const p = 2; // parameters
  const residSq = y.map((yi, i) => (yi - muF[i]) ** 2);
  const numerator = residSq.reduce((a, b) => a + (b - muF.shift ? 0 : b), 0); // placeholder, we'll compute properly
  // compute numerator = sum((yi - mu)^2 - mu)
  let numr = 0; let denom = 0;
  for (let i = 0; i < n; i++) { numr += (y[i] - muF[i]) ** 2 - muF[i]; denom += muF[i] * muF[i]; }
  const alpha = denom > 0 ? Math.max(0, numr / denom) : 0;

  // forecasting for future steps: extrapolate time index and choose exposure
  const forecasts: number[] = [];
  const lastIdx = n;
  // pick future exposure: average observed exposure or 1
  const avgExposure = exposures && exposures.length > 0 ? (exposures.reduce((a, b) => a + b, 0) / exposures.length) : 1;
  for (let s = 1; s <= steps; s++) {
    const xi = lastIdx + s;
    const off = Math.log(Math.max(1e-6, avgExposure));
    const etaFut = beta[0] + beta[1] * xi + off;
    let muPred = Math.exp(etaFut);
    if (family === 'nb') {
      // NB mean is muPred, variance = mu + alpha * mu^2; we return expected mean
    }
    forecasts.push(Math.max(0, Math.round(muPred)));
  }

  return { forecasts, mu: muF, beta, alpha } as any;
};

// Simple trailing moving average smoothing (window size w)
const movingAverage = (values: number[], w = 3) => {
  if (values.length === 0) return [] as number[];
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - (w - 1));
    const window = values.slice(start, i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    out.push(avg);
  }
  return out;
};

// Naive baseline: repeat last observed value
const naiveBaselineForecast = (values: number[], steps: number) => {
  const n = values.length;
  if (n === 0) return Array(steps).fill(0);
  const last = values[n - 1];
  return Array(steps).fill(Math.max(0, Math.round(last)));
};

const TrendChart: React.FC<TrendChartProps> = ({ series, forecastPoints = 7 }) => {
  const values = series.map(p => p.y);
  const labels = series.map(p => p.x);
  const reg = linearRegressionForecast(values, forecastPoints);
  const forecastArr = reg.forecasts || [];

  const fullValues = [...values, ...forecastArr];
  const max = Math.max(...fullValues, 1);

  const width = Math.min(900, Math.max(400, fullValues.length * 40));
  const height = 280;
  const pad = 40;

  const mapX = (i: number) => pad + (i / (fullValues.length - 1 || 1)) * (width - pad * 2);
  const mapY = (v: number) => height - pad - (v / max) * (height - pad * 2);

  const pointsPath = fullValues.map((v, i) => `${i === 0 ? 'M' : 'L'} ${mapX(i)} ${mapY(v)}`).join(' ');

  // ticks
  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((i / yTicks) * max));
  const xTickCount = Math.min(6, fullValues.length - 1);
  const xTickIndices = Array.from({ length: xTickCount + 1 }, (_, i) => Math.round((i / (xTickCount || 1)) * (fullValues.length - 1)));

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={width} height={height}>
        {/* background */}
        <rect x={0} y={0} width="100%" height="100%" fill="transparent" />

        {/* horizontal grid + labels */}
        {yTickValues.map((val, i) => (
          <g key={i}>
            <line x1={pad} x2={width - pad} y1={mapY(val)} y2={mapY(val)} stroke="#e9ecef" strokeWidth={1} />
            <text x={8} y={mapY(val) + 4} fontSize={11} fill="#6c757d">{val}</text>
          </g>
        ))}

        {/* confidence band (95%) around regression line */}
        {reg && reg.sigma > 0 && (
          (() => {
            const n = reg.n || values.length;
            const den = reg.denom || 0;
            const meanX = reg.meanX || (n > 0 ? (n + 1) / 2 : 0);
            const slope = reg.slope;
            const intercept = reg.intercept;
            const sigma = reg.sigma;
            const z = 1.96; // ~95%
            const fullLen = fullValues.length;
            const upper: number[] = [];
            const lower: number[] = [];
            for (let i = 0; i < fullLen; i++) {
              const xi = i + 1; // regression x index
              const yhat = intercept + slope * xi;
              let se = 0;
              if (n > 0) {
                const term = den > 0 ? ((xi - meanX) ** 2) / den : 0;
                se = sigma * Math.sqrt(1 + 1 / n + term);
              }
              upper.push(yhat + z * se);
              lower.push(Math.max(0, yhat - z * se));
            }
            const upperPath = upper.map((v, i) => `${i === 0 ? 'M' : 'L'} ${mapX(i)} ${mapY(v)}`).join(' ');
            const lowerPath = lower.slice().reverse().map((v, idx) => {
              const i = fullLen - 1 - idx;
              return `${idx === 0 ? 'M' : 'L'} ${mapX(i)} ${mapY(v)}`;
            }).join(' ');
            const poly = `${upperPath} ${lowerPath} Z`;
            return (
              <path key="band" d={poly} fill="rgba(220,53,69,0.12)" stroke="none" />
            );
          })()
        )}

        {/* line for observed values */}
        <path d={pointsPath} fill="none" stroke="#dc3545" strokeWidth={2} />

        {/* forecast dashed line segment */}
        {forecastArr.length > 0 && values.length > 0 && (
          <path
            d={(() => {
              const start = values.length - 1;
              const seg = forecastArr.map((v, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(start + 1 + idx)} ${mapY(v)}`).join(' ');
              return `M ${mapX(start)} ${mapY(values[start])} ${seg}`;
            })()}
            fill="none"
            stroke="#6c757d"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
        )}

        {/* points: observed & forecast */}
        {fullValues.map((v, i) => (
          <circle key={i} cx={mapX(i)} cy={mapY(v)} r={i < values.length ? 4 : 3.2} fill={i < values.length ? '#dc3545' : '#6c757d'} />
        ))}

        {/* x-axis labels */}
        {xTickIndices.map((idx, i) => (
          <g key={i} transform={`translate(${mapX(idx)}, ${height - pad + 4})`}>
            <line x1={0} x2={0} y1={-6} y2={0} stroke="#adb5bd" />
            <text x={-20} y={16} fontSize={11} fill="#495057">{labels[idx] || ''}</text>
          </g>
        ))}

      </svg>

      <div className="mt-2 small text-muted">
        <strong>Legend:</strong> <span className="ms-2">Observed (red)</span>, <span className="ms-2">Forecast (dashed gray)</span>
      </div>
    </div>
  );
};

export default TrendChart;
