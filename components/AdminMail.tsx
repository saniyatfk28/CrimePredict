import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';

type AdminEmail = {
  id: number;
  sender: string;
  recipient: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

const ADMIN_INBOX_URL = '/api/admin/inbox/';
const ADMIN_UNREAD_COUNT_URL = '/api/admin/email/unread-count/';
const ADMIN_SEND_EMAIL_URL = 'http://127.0.0.1:8000/api/admin/send-email/';
const ADMIN_MARK_READ_URL = (id: number) => `/api/admin/email/${id}/read/`;

const AdminMail: React.FC = () => {
  const navigate = useNavigate();

  const authData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('crimepredict_auth') || '{}');
    } catch {
      return {};
    }
  }, []);

  const currentUser = authData.user as { role?: UserRole } | undefined;

  // Local-only demo auth: we cannot call the protected backend endpoints unless
  // backend auth exists. So we try calls, but also gracefully fall back to local stubs.
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [emails, setEmails] = useState<AdminEmail[]>([]);

  const [error, setError] = useState<string>('');

  // Send form
  const [recipients, setRecipients] = useState('admin@crimepredict.com');
  const [subject, setSubject] = useState('Test email from CrimePredict');
  const [message, setMessage] = useState('This is a test email to verify the admin mail API is reachable.');

  const safeLocalStub = () => {
    // Basic local stub: keeps UI usable even if backend auth isn't wired yet.
    const stub: AdminEmail[] = [
      {
        id: Date.now(),
        sender: 'stub@local',
        recipient: 'admin@crimepredict.com',
        subject: 'Demo: no backend auth wired yet',
        message: 'Backend endpoints are protected. Once DRF auth is added, this UI will switch to real inbox polling.',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ];
    setEmails(stub);
    setUnreadCount(1);
  };

  const fetchInbox = async () => {
    const res = await fetch(ADMIN_INBOX_URL, { credentials: 'include' });
    if (!res.ok) throw new Error(`Inbox fetch failed: ${res.status}`);
    const data = await res.json();
    setEmails(data);
  };

  const fetchUnreadCount = async () => {
    const res = await fetch(ADMIN_UNREAD_COUNT_URL, { credentials: 'include' });
    if (!res.ok) throw new Error(`Unread count fetch failed: ${res.status}`);
    const data = await res.json();
    setUnreadCount(Number(data.unread_count || 0));
  };

  useEffect(() => {
    // Role guard in UI (local demo)
    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      navigate('/');
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      setError('');
      try {
        await fetchInbox();
        await fetchUnreadCount();
      } catch (e: any) {
        // Most likely 401/403 due to missing DRF auth
        if (!cancelled) {
          safeLocalStub();
          setError('Backend mail is protected (DRF auth not configured). Showing local demo inbox.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrap();

    const interval = setInterval(async () => {
      if (!polling) return;
      try {
        await fetchUnreadCount();
      } catch {
        // keep quiet during polling
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling]);

  const onMarkRead = async (id: number) => {
    // Optimistically update UI first
    setEmails(prev => prev.map(e => (e.id === id ? { ...e, is_read: true } : e)));

    // If we are in local stub mode, skip server calls.
    // Heuristic: stub ids won't match backend anyway; but we also attempt call and fallback.
    try {
      const res = await fetch(ADMIN_MARK_READ_URL(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Mark read failed');
      const data = await res.json();
      setEmails(prev => prev.map(e => (e.id === id ? data : e)));
      // If unread_count exists, refetch
      try {
        await fetchUnreadCount();
      } catch {
        // ignore
      }
    } catch {
      // ignore in demo mode
    }
  };

  const onSend = async () => {
    setError('');

    const toList = recipients
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (!toList.length) {
      setError('Please enter at least one recipient email.');
      return;
    }

    try {
      const res = await fetch(ADMIN_SEND_EMAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: toList, subject, message }),
      });

      if (!res.ok) throw new Error(`Send failed: ${res.status}`);

      // Refresh inbox after send
      await fetchInbox();
      await fetchUnreadCount();
    } catch {
      // In demo mode, just show local hint.
      setError('Send-email is protected (DRF auth not configured). Nothing sent yet; demo mode only.');
      safeLocalStub();
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-success m-0">Admin Mail</h2>
          <p className="text-muted">Inbox + send test messages (demo-friendly).</p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="position-relative">
            <button className="btn btn-outline-success" onClick={() => setPolling(v => !v)}>
              <i className={`fas me-2 ${polling ? 'fa-bell' : 'fa-pause'}`} />{polling ? 'Polling ON' : 'Polling OFF'}
            </button>

            {unreadCount > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                style={{ transform: 'translate(-35%, -35%)' }}
              >
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-warning">{error}</div>}
      {loading && (
        <div className="text-muted">
          <i className="fas fa-spinner fa-spin me-2" /> Loading inbox...
        </div>
      )}

      {/* Send mail */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0 fw-bold"><i className="fas fa-paper-plane me-2 text-success" />Send Email</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-12">
              <label className="form-label fw-bold small">Recipients (comma separated)</label>
              <input className="form-control" value={recipients} onChange={e => setRecipients(e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold small">Subject</label>
              <input className="form-control" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold small">Quick Test</label>
              <button
                className="btn btn-outline-success w-100"
                onClick={() => {
                  setRecipients('admin@crimepredict.com');
                  setSubject('Test email from CrimePredict');
                  setMessage('This is a test email to verify /api/admin/send-email/.');
                }}
                type="button"
              >
                <i className="fas fa-wand-magic-sparkles me-2" />Fill defaults
              </button>
            </div>
            <div className="col-md-12">
              <label className="form-label fw-bold small">Message</label>
              <textarea className="form-control" rows={4} value={message} onChange={e => setMessage(e.target.value)} />
            </div>
            <div className="col-md-12 d-flex gap-2">
              <button className="btn btn-success fw-bold" onClick={onSend} type="button">
                <i className="fas fa-paper-plane me-2" />Send
              </button>
              <button className="btn btn-outline-secondary fw-bold" onClick={() => setError('')} type="button">
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inbox */}
      <div className="card shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold"><i className="fas fa-inbox me-2 text-success" />Inbox</h5>
          <span className="badge bg-success-subtle text-success border border-success">
            {emails.length} messages
          </span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '110px' }}>Status</th>
                  <th>Subject</th>
                  <th style={{ width: '220px' }}>Recipient</th>
                  <th style={{ width: '170px' }}>Received</th>
                  <th style={{ width: '130px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {emails.length ? (
                  emails.map(e => (
                    <tr key={e.id}>
                      <td>
                        <span className={`badge ${e.is_read ? 'bg-secondary' : 'bg-danger'}`}>
                          {e.is_read ? 'Read' : 'Unread'}
                        </span>
                      </td>
                      <td>
                        <div className="fw-bold">{e.subject}</div>
                        <div className="small text-muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 420 }}>
                          {e.message}
                        </div>
                      </td>
                      <td className="text-muted">{e.recipient}</td>
                      <td className="small text-muted">
                        {e.created_at ? new Date(e.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td>
                        {!e.is_read ? (
                          <button className="btn btn-outline-success btn-sm fw-bold" onClick={() => onMarkRead(e.id)}>
                            Mark read
                          </button>
                        ) : (
                          <button className="btn btn-outline-secondary btn-sm fw-bold" disabled>
                            Done
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">
                      <i className="fas fa-inbox fa-2x d-block mb-3 opacity-25" /> No emails yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMail;

