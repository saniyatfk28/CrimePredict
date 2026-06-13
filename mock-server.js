const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, 'mock_uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = Date.now() + '-' + Math.random().toString(36).slice(2,8) + ext;
    cb(null, name);
  }
});

const upload = multer({ storage });
const app = express();
app.use(cors());

const META_FILE = path.join(UPLOAD_DIR, 'metadata.json');
function readMeta() {
  try { return JSON.parse(fs.readFileSync(META_FILE, 'utf8') || '[]'); } catch { return []; }
}
function writeMeta(m) { fs.writeFileSync(META_FILE, JSON.stringify(m, null, 2)); }

app.post('/api/upload-crime-photo/', upload.single('image'), (req, res) => {
  const file = req.file;
  const { district, crime_type, description } = req.body;
  if (!file) return res.status(400).json({ error: 'no file' });

  const relative = '/mock_uploads/' + file.filename;
  const meta = readMeta();
  const entry = {
    id: Date.now(),
    district: district || '',
    crime_type: crime_type || '',
    description: description || '',
    image: relative,
    created_at: new Date().toISOString()
  };
  meta.unshift(entry);
  writeMeta(meta);
  res.json({ ok: true, id: entry.id, image: relative });
});

app.get('/api/crime-photos/', (req, res) => {
  res.json(readMeta());
});

app.use('/mock_uploads', express.static(UPLOAD_DIR));

const port = process.env.PORT || 5000;
app.listen(port, () => console.log('Mock server running on', port));
