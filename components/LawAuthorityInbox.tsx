import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '../types';
import { buildRoomId } from '../src/utils/chatRoom';



type ChatEntry = {
  sender: string;
  role?: 'citizen' | 'law' | 'unknown' | string;
  userId?: string | null;
  message: string;
  timestamp: string;
};


type IncomingWsMessage =
  | { type: 'history'; messages: ChatEntry[] }
  | { type: 'message'; message: ChatEntry };


function getWsBaseUrl() {
  // Final dev backend WebSocket URL
  return "ws://127.0.0.1:8000";
}

type ConversationIds = {
  citizenId?: string;
  lawyerId?: string;
  incidentId?: string;
};

function getConversationIds(): ConversationIds {

  // Prefer incidentId when available; otherwise fall back to citizen/lawyer.
  // These IDs should already be available in the app context or URL params in a real integration.
  // For now, we keep existing behavior as a demo by using the same fallback room.
  return {
    citizenId: undefined,
    lawyerId: undefined,
    incidentId: undefined,
  };
}


export default function LawAuthorityInbox() {
  const authData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('crimepredict_auth') || '{}');
    } catch {
      return {} as any;
    }
  }, []);

  const currentUser: User | null = authData.user || null;

  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // 🔥 FIX 1: Prevent React StrictMode double-connect issues
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const { citizenId, lawyerId, incidentId } = getConversationIds();
    const roomId = buildRoomId({ citizenId, lawyerId, incidentId });

    const wsUrl = `${getWsBaseUrl()}/ws/chat/${encodeURIComponent(roomId)}/`;


    setWsStatus('connecting');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus('connected');
    ws.onerror = () => setWsStatus('disconnected');

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
        setMessages((prev) => [...prev, parsed.message]);
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      setWsStatus('disconnected');
    };

    return () => {
      // 🔥 FIX 2: Safe cleanup (avoid double close issues)
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = (overrideText?: string) => {
    const text = (overrideText ?? chatInput).trim();
    if (!text) return;

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(
      JSON.stringify({
        message: text,
        sender:
          (currentUser as any)?.displayName ||
          currentUser?.fullName ||
          currentUser?.username ||
          'Anonymous',
        role: 'law',
        userId: currentUser?.id || null,
        timestamp: new Date().toISOString(),
      })

    );

    if (overrideText === undefined) setChatInput('');
  };

  const quickTemplate =
    'Please share the exact location and any visible details (time, direction, suspects).';

  return (
    <div className="card dashboard-card border-0 shadow-sm">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 className="mb-0 fw-bold text-primary">
          <i className="fas fa-inbox me-2"></i> Authorities Inbox
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
            messages.map((m, idx) => {
              const isCitizen = m.role === 'citizen';
              const align = isCitizen ? 'text-start' : 'text-end';
              const bubbleClass = isCitizen
                ? 'bg-success-subtle border-success-subtle'
                : 'bg-primary-subtle border-primary-subtle';
              const borderClass = isCitizen
                ? 'border border-success-subtle'
                : 'border border-primary-subtle';

              return (
                <div key={`${m.timestamp}-${idx}`} className={`mb-3 ${align}`}>
                  <div className="small text-secondary">
                    {m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}
                  </div>
                  <div className="fw-bold">
                    {m.sender} <small className="text-muted">→</small>
                  </div>
                  <div
                    className={`small d-inline-block px-3 py-2 rounded ${bubbleClass} ${borderClass}`}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })

          )}
          <div ref={scrollRef} />
        </div>

        <div className="card-footer bg-white d-flex gap-2">
          <input
            className="form-control"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a reply to the citizen..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendMessage();
            }}
          />

          <button
            className="btn btn-primary"
            disabled={wsStatus !== 'connected'}
            onClick={() => sendMessage()}
          >
            Reply
          </button>

          <button
            className="btn btn-outline-secondary"
            disabled={wsStatus !== 'connected'}
            onClick={() => sendMessage(quickTemplate)}
            title="Quick message"
          >
            <i className="fas fa-bolt me-1" />
            Quick
          </button>
        </div>
      </div>
    </div>
  );
}