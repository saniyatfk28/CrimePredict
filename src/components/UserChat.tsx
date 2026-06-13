import React, { useEffect, useMemo, useRef, useState } from 'react';

import type { User } from '../../types';

import { buildRoomId } from '../utils/chatRoom';


type ChatEntry = {
  sender: string;
  role: 'citizen' | 'law' | 'unknown' | string;
  userId?: string | null;
  message: string;
  timestamp: string;
};

type IncomingWsMessage =
  | { type: 'history'; messages: ChatEntry[] }
  | { type: 'message'; message: ChatEntry };

function getWsBaseUrl() {
  // Prefer an explicit WS origin when frontend + backend run on different ports.
  // Example: set VITE_WS_ORIGIN=http://localhost:8000
  const configuredOrigin = import.meta.env?.VITE_WS_ORIGIN as string | undefined;
  if (configuredOrigin) {
    return configuredOrigin.replace(/^http/, 'ws');
  }

  // Fallback: same-origin
  const origin = window.location.origin;
  return origin.replace(/^http/, 'ws');
}

export default function UserChat({
  citizenId,
  lawyerId,
  incidentId,
  title,
}: {
  citizenId?: string;
  lawyerId?: string;
  incidentId?: string;
  title?: string;
}) {
  const authData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('crimepredict_auth') || '{}');
    } catch {
      return {} as any;
    }
  }, []);

  const currentUser: User | null = authData.user || null;

  const roomId = useMemo(
    () => buildRoomId({ citizenId, lawyerId, incidentId }),
    [citizenId, lawyerId, incidentId]
  );

  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [chatInput, setChatInput] = useState('');

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsBase = getWsBaseUrl();
    const wsUrl = `${wsBase}/ws/chat/${encodeURIComponent(roomId)}/`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // server pushes history on connect
    };

    ws.onmessage = (event) => {
      let parsed: IncomingWsMessage | null = null;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }

      if (!parsed) return;

      if (parsed.type === 'history') {
        setMessages(Array.isArray(parsed.messages) ? parsed.messages : []);
      } else if (parsed.type === 'message') {
        setMessages((prev) => [...prev, parsed!.message]);
      }
    };

    ws.onerror = () => {
      // keep UI alive
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
    };
  }, [roomId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const sender =
      currentUser?.fullName || currentUser?.username || 'Anonymous';

    ws.send(
      JSON.stringify({
        message: text,
        sender,
        role: 'citizen',
        userId: currentUser?.id || null,
        timestamp: new Date().toISOString(),
      })
    );

    setChatInput('');
  };

  const renderMessage = (m: ChatEntry, idx: number) => {
    const isCitizen = m.role === 'citizen';
    const align = isCitizen ? 'text-start' : 'text-end';
    const bubbleClass = isCitizen ? 'bg-success-subtle border-success-subtle' : 'bg-primary-subtle border-primary-subtle';
    const borderClass = isCitizen ? 'border border-success-subtle' : 'border border-primary-subtle';

    return (
      <div key={`${m.timestamp}-${idx}`} className={`mb-3 ${align}`}>
        <div className="small text-secondary">
          {m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}
        </div>
        <div className="fw-bold">
          {m.sender} <small className="text-muted">→</small>
        </div>
        <div className={`small d-inline-block px-3 py-2 rounded ${bubbleClass} ${borderClass}`}>
          {m.message}
        </div>
      </div>
    );
  };

  return (
    <div className="card dashboard-card border-0 shadow-sm">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 className="mb-0 fw-bold text-primary">
          <i className="fas fa-comments me-2"></i>
          {title || 'Citizen ↔ Law Chat'}
        </h5>
        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
          {messages.length} msgs
        </span>
      </div>

      <div className="card-body p-0">
        <div className="p-3" style={{ maxHeight: '340px', overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <div className="text-muted small p-2">No messages yet.</div>
          ) : (
            messages.map(renderMessage)
          )}
          <div ref={scrollRef} />
        </div>

        <div className="card-footer bg-white d-flex gap-2">
          <input
            className="form-control"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendMessage();
            }}
          />
          <button className="btn btn-primary" onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

