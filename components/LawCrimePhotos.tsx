import React, { useEffect, useState } from "react";

export default function LawCrimePhotos() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/crime-photos/')
      .then(res => res.json())
      .then((data) => setPhotos(data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <h2>Citizen Submitted Crime Photos</h2>
      {loading && <div>Loading…</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>
        {photos.map(p => (
          <div key={p.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8, background: '#fff' }}>
            <div style={{ height: 180, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={p.image.startsWith('http') ? p.image : (window.location.origin + p.image)} alt={p.description} style={{ maxWidth: '100%', maxHeight: '100%' }} />
            </div>
            <div style={{ padding: 8 }}>
              <div style={{ fontWeight: 800 }}>{p.crime_type} — {p.district}</div>
              <div style={{ marginTop: 6 }}>{p.description}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>{new Date(p.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
