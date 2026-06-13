import React, { useState } from "react";

const districts = [
  "Dhaka","Chattogram","Rajshahi","Khulna","Barisal",
  "Sylhet","Rangpur","Mymensingh","Bagerhat","Bandarban"
];

export default function ReportCrimePhoto() {
  const [image, setImage] = useState<File | null>(null);
  const [district, setDistrict] = useState("");
  const [crimeType, setCrimeType] = useState("theft");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!image || !district) return alert("Please select a district and choose a photo.");

    const form = new FormData();
    form.append("image", image);
    form.append("district", district);
    form.append("crime_type", crimeType);
    form.append("description", description);

    setLoading(true);
    try {
      const res = await fetch('/api/upload-crime-photo/', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      alert('Photo submitted — thank you.');
      // reset
      setImage(null);
      setDescription('');
      setCrimeType('theft');
      setDistrict('');
      // clear file input if present via DOM
      const el = document.getElementById('report-photo-file') as HTMLInputElement | null;
      if (el) el.value = '';
    } catch (err: any) {
      console.error(err);
      alert('Upload failed: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 760 }}>
      <h2>Report Crime (Photo)</h2>

      <div style={{ margin: '12px 0' }}>
        <label style={{ display: 'block', marginBottom: 6 }}>District</label>
        <select value={district} onChange={e => setDistrict(e.target.value)} style={{ width: '100%', padding: 8 }}>
          <option value="">Select District</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div style={{ margin: '12px 0' }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Crime Type</label>
        <select value={crimeType} onChange={e => setCrimeType(e.target.value)} style={{ width: '100%', padding: 8 }}>
          <option value="theft">Theft</option>
          <option value="assault">Assault</option>
          <option value="robbery">Robbery</option>
          <option value="rape">Rape</option>
          <option value="murder">Murder</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div style={{ margin: '12px 0' }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Description (optional)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', minHeight: 90, padding: 8 }} placeholder="What happened?" />
      </div>

      <div style={{ margin: '12px 0' }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Photo</label>
        <input id="report-photo-file" type="file" accept="image/*" onChange={e => setImage(e.target.files?.[0] || null)} />
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={submit} disabled={loading} style={{ padding: '10px 14px' }}>
          {loading ? 'Uploading...' : 'Submit Photo'}
        </button>
      </div>
    </div>
  );
}
