import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DATASET_DB_KEY = 'crimepredict_dataset';

const DataUpload: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [uploadedData, setUploadedData] = useState<any[]>([]);

  // Load previously uploaded data
  React.useEffect(() => {
    const savedData = localStorage.getItem(DATASET_DB_KEY);
    if (savedData) {
      setUploadedData(JSON.parse(savedData));
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file first' });
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          
          // Check if it's CSV
          if (file.name.endsWith('.csv')) {
            const rows = content.split('\n').filter(row => row.trim());
            const headers = rows[0].split(',').map(h => h.trim());
            const data = rows.slice(1).map(row => {
              const values = row.split(',').map(v => v.trim());
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = values[index];
              });
              return obj;
            });
            
            localStorage.setItem(DATASET_DB_KEY, JSON.stringify(data));
            setUploadedData(data);
            setMessage({ 
              type: 'success', 
              text: `Dataset uploaded successfully! ${data.length} records loaded.` 
            });
          } 
          // Check if it's JSON
          else if (file.name.endsWith('.json')) {
            const data = JSON.parse(content);
            const dataArray = Array.isArray(data) ? data : [data];
            localStorage.setItem(DATASET_DB_KEY, JSON.stringify(dataArray));
            setUploadedData(dataArray);
            setMessage({ 
              type: 'success', 
              text: `Dataset uploaded successfully! ${dataArray.length} records loaded.` 
            });
          } else {
            setMessage({ type: 'error', text: 'Please upload a CSV or JSON file' });
          }
          
          setFile(null);
          if (e.target) (e.target as any).value = '';
        } catch (error) {
          setMessage({ type: 'error', text: 'Error parsing file. Please check the format.' });
        }
        setLoading(false);
      };

      reader.onerror = () => {
        setMessage({ type: 'error', text: 'Error reading file' });
        setLoading(false);
      };

      reader.readAsText(file);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error uploading file' });
      setLoading(false);
    }
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all uploaded data?')) {
      localStorage.removeItem(DATASET_DB_KEY);
      setUploadedData([]);
      setMessage({ type: 'success', text: 'Dataset cleared successfully' });
    }
  };

  const handleDownloadAsCSV = () => {
    if (uploadedData.length === 0) {
      setMessage({ type: 'error', text: 'No data to download' });
      return;
    }

    try {
      const headers = Object.keys(uploadedData[0]);
      const csvContent = [
        headers.join(','),
        ...uploadedData.map(row =>
          headers.map(header => {
            const value = row[header];
            // Escape quotes and wrap in quotes if contains comma
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `crime_dataset_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMessage({ type: 'success', text: 'Dataset downloaded successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error downloading dataset' });
    }
  };

  const handleDownloadAsJSON = () => {
    if (uploadedData.length === 0) {
      setMessage({ type: 'error', text: 'No data to download' });
      return;
    }

    try {
      const jsonContent = JSON.stringify(uploadedData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `crime_dataset_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMessage({ type: 'success', text: 'Dataset downloaded successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error downloading dataset' });
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-danger">
            <i className="fas fa-database me-2"></i>Dataset Management
          </h2>
          <p className="text-muted">Upload crime dataset to power the prediction system</p>
        </div>
        <button 
          className="btn btn-outline-secondary" 
          onClick={() => navigate('/dashboard/admin')}
        >
          <i className="fas fa-arrow-left me-2"></i>Back
        </button>
      </div>

      {/* Upload Section */}
      <div className="card border-0 shadow-sm p-4 mb-4 rounded-4">
        <h5 className="fw-bold mb-3">
          <i className="fas fa-cloud-upload-alt me-2 text-danger"></i>Upload Dataset
        </h5>
        
        <div className="row g-3">
          <div className="col-md-8">
            <div className="input-group shadow-sm rounded-3 overflow-hidden">
              <input 
                type="file" 
                className="form-control" 
                accept=".csv,.json"
                onChange={handleFileChange}
                disabled={loading}
              />
              <button 
                className="btn btn-danger" 
                onClick={handleUpload}
                disabled={!file || loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <i className="fas fa-upload me-2"></i>Upload
                  </>
                )}
              </button>
            </div>
            <small className="text-muted d-block mt-2">
              Supported formats: CSV, JSON
            </small>
          </div>
          
          {uploadedData.length > 0 && (
            <div className="col-md-4">
              <button 
                className="btn btn-outline-danger w-100" 
                onClick={handleClearData}
              >
                <i className="fas fa-trash me-2"></i>Clear Dataset
              </button>
            </div>
          )}
        </div>

        {message && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} mt-3 rounded-3`} role="alert">
            <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2`}></i>
            {message.text}
          </div>
        )}
      </div>

      {/* Dataset Preview */}
      {uploadedData.length > 0 && (
        <div className="card border-0 shadow-sm p-4 rounded-4 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="fw-bold mb-2">
                <i className="fas fa-table me-2 text-danger"></i>Dataset Preview
              </h5>
              <span className="badge bg-danger">
                <i className="fas fa-database me-1"></i>{uploadedData.length} Records Loaded
              </span>
            </div>
            <div className="btn-group" role="group">
              <button 
                className="btn btn-sm btn-success"
                onClick={handleDownloadAsCSV}
                title="Download as CSV"
              >
                <i className="fas fa-file-csv me-2"></i>CSV
              </button>
              <button 
                className="btn btn-sm btn-info"
                onClick={handleDownloadAsJSON}
                title="Download as JSON"
              >
                <i className="fas fa-file-code me-2"></i>JSON
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover table-sm">
              <thead className="table-light">
                <tr>
                  {uploadedData.length > 0 && Object.keys(uploadedData[0]).map((key) => (
                    <th key={key} className="fw-bold text-danger">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploadedData.slice(0, 10).map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value: any, colIndex) => (
                      <td key={colIndex} className="small">{String(value)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {uploadedData.length > 10 && (
            <p className="text-muted text-center mt-3">
              Showing 10 of {uploadedData.length} records
            </p>
          )}
        </div>
      )}

      {uploadedData.length === 0 && (
        <div className="alert alert-info rounded-4" role="alert">
          <i className="fas fa-info-circle me-2"></i>
          <strong>No dataset uploaded yet.</strong> Upload a CSV or JSON file to get started. The data will be stored locally and used by the prediction system.
        </div>
      )}
    </div>
  );
};

export default DataUpload;
