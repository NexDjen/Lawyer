const STORAGE_KEY = 'chat_sessions';

export function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      : [];
  } catch (_) {
    return [];
  }
}

export function saveSessions(sessions = []) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (_) {}
}

export function createSession() {
  const id = `chat_${Date.now()}`;
  const now = new Date().toISOString();
  return {
    id,
    title: 'Новый чат',
    createdAt: now,
    updatedAt: now,
    messages: []
  };
}

export function getSessionById(sessions, id) {
  return sessions.find(s => s.id === id) || null;
}

export function upsertSession(sessions, session) {
  const idx = sessions.findIndex(s => s.id === session.id);
  const copy = [...sessions];
  if (idx >= 0) copy[idx] = session; else copy.unshift(session);
  saveSessions(copy);
  return copy;
}

export function deleteSession(sessions, id) {
  const copy = sessions.filter(s => s.id !== id);
  saveSessions(copy);
  return copy;
}

export function generateTitleFromMessages(messages = []) {
  const firstUser = messages.find(m => m.type === 'user');
  if (!firstUser) return 'Новый чат';
  const text = (firstUser.content || '').trim().replace(/\s+/g, ' ');
  return text.length > 48 ? text.slice(0, 48) + '…' : text || 'Новый чат';
}

