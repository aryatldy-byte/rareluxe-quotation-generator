'use client';

import { useCallback, useEffect, useState } from 'react';
import { EVENT_TYPES, MAX_IMAGE_BYTES, typeLabel } from '@/lib/constants';

export default function AdminPage() {
  const [state, setState] = useState('checking'); // checking | out | in
  const [password, setPassword] = useState('');
  const [themes, setThemes] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState({ name: '', event_type: 'birthday', file: null });

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/themes');
    if (r.status === 401) return setState('out');
    const j = await r.json();
    if (!r.ok) return setError(j.error);
    setThemes(j.themes);
  }, []);

  useEffect(() => {
    fetch('/api/admin/session').then((r) => r.json()).then((j) => {
      setState(j.admin ? 'in' : 'out');
      if (j.admin) load();
    });
  }, [load]);

  async function login(e) {
    e.preventDefault();
    setError('');
    const r = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
    });
    if (!r.ok) return setError((await r.json()).error || 'Login failed');
    setPassword('');
    setState('in');
    load();
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setState('out');
  }

  async function upload(e) {
    e.preventDefault();
    setError('');
    if (!up.file) return setError('Choose an image.');
    if (up.file.size > MAX_IMAGE_BYTES) return setError('Image must be 4 MB or smaller.');
    setBusy(true);
    const fd = new FormData();
    fd.set('name', up.name);
    fd.set('event_type', up.event_type);
    fd.set('file', up.file);
    const r = await fetch('/api/admin/themes', { method: 'POST', body: fd });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setError(j.error);
    setUp({ name: '', event_type: up.event_type, file: null });
    e.target.reset();
    load();
  }

  async function reassign(id, event_type) {
    const r = await fetch('/api/admin/themes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, event_type }),
    });
    if (!r.ok) return setError((await r.json()).error);
    setThemes((t) => t.map((x) => (x.id === id ? { ...x, event_type: event_type || null } : x)));
  }

  async function del(id) {
    if (!confirm('Delete this theme image?')) return;
    const r = await fetch(`/api/admin/themes?id=${id}`, { method: 'DELETE' });
    if (!r.ok) return setError((await r.json()).error);
    setThemes((t) => t.filter((x) => x.id !== id));
  }

  if (state === 'checking') return <p className="text-sm">Loading…</p>;

  if (state === 'out') {
    return (
      <form onSubmit={login} className="panel mx-auto max-w-sm space-y-4">
        <h1 className="font-serif text-2xl font-bold text-pine">Admin sign in</h1>
        <div>
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full">Sign in</button>
      </form>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold text-pine">Theme gallery</h1>
        <button className="btn-ghost" onClick={logout}>Sign out</button>
      </div>
      <p className="mt-1 text-sm text-ink/70">
        Upload sample décor images and assign them to an event type. New quotations of that type use the newest assigned image unless the client supplies their own.
      </p>

      <form onSubmit={upload} className="panel mt-6 grid gap-4 sm:grid-cols-[1fr_180px_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="tn">Theme name</label>
          <input id="tn" required value={up.name} onChange={(e) => setUp({ ...up, name: e.target.value })} placeholder="Teddy & balloons" />
        </div>
        <div>
          <label htmlFor="tt">Event type</label>
          <select id="tt" value={up.event_type} onChange={(e) => setUp({ ...up, event_type: e.target.value })}>
            {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            <option value="">Any event type</option>
          </select>
        </div>
        <div>
          <label htmlFor="tf">Image</label>
          <input id="tf" type="file" accept="image/*" required onChange={(e) => setUp({ ...up, file: e.target.files?.[0] || null })} />
        </div>
        <button className="btn-gold" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
      </form>

      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {themes.length === 0 ? (
        <p className="mt-8 text-sm">No themes yet. Upload your first image above.</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((t) => (
            <div key={t.id} className="overflow-hidden rounded-lg border border-gold/40 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.image_url} alt={t.name} className="aspect-[4/3] w-full bg-band object-cover" />
              <div className="space-y-2 p-3">
                <div className="font-semibold text-pine">{t.name}</div>
                <select aria-label={`Event type for ${t.name}`} value={t.event_type || ''} onChange={(e) => reassign(t.id, e.target.value)}>
                  {EVENT_TYPES.map((x) => <option key={x.value} value={x.value}>{typeLabel(x.value)}</option>)}
                  <option value="">Any event type</option>
                </select>
                <button className="btn-danger w-full" onClick={() => del(t.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
