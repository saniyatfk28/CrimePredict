import React, { useEffect, useState } from 'react';



type CrimeNewsItem = {
  title: string;
  link: string;
  image: string | null;
  source: string;
};

const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360"><rect width="600" height="360" fill="#eef2ff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="18" fill="#6b7280">No Image</text></svg>`
  );

const CrimeRelatedNews: React.FC = () => {
  const [items, setItems] = useState<CrimeNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('http://127.0.0.1:8000/api/news/crime/');
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`News API failed: ${res.status} ${txt ? txt.slice(0, 120) : ''}`.trim());
        }
        const data = (await res.json()) as CrimeNewsItem[];
        if (!cancelled) setItems(Array.isArray(data) ? data : []);

      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load news');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="card dashboard-card h-100">
      <div className="card-header bg-white py-3 border-bottom-0">
        <h5 className="mb-0 fw-bold">
          <i className="fas fa-newspaper me-2 text-success"></i> Related Crime News
        </h5>
      </div>

      <div className="card-body">
        {loading && (
          <div className="text-muted">
            <i className="fas fa-spinner fa-spin me-2"></i> Loading live RSS news...
          </div>
        )}

        {error && (
          <div className="alert alert-warning mb-0">
            <i className="fas fa-triangle-exclamation me-2"></i>
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-center text-muted py-5">
            <i className="fas fa-newspaper-slash fa-2x mb-3 opacity-25"></i>
            <div>No related crime news found right now.</div>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="row g-3">
            {items.map((it, idx) => (
              <div key={it.link + idx} className="col-md-6 col-lg-4">
                <a
                  href={it.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-decoration-none"
                  style={{ display: 'block' }}
                >
                  <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: 14 }}>
                    <img
                      src={it.image || PLACEHOLDER_IMAGE}
                      alt={it.title}
                      style={{ height: 150, width: '100%', objectFit: 'cover', borderTopLeftRadius: 14, borderTopRightRadius: 14 }}
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.src = PLACEHOLDER_IMAGE;
                      }}
                    />
                    <div className="card-body p-3">
                      <div className="small text-muted mb-2">{it.source}</div>
                      <div className="fw-bold" style={{ fontSize: 14, lineHeight: 1.25 }}>
                        {it.title}
                      </div>
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};



export default CrimeRelatedNews;



