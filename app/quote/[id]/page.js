'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { EVENT_TYPES, inr, fmtDate, eventTitle, typeLabel } from '@/lib/constants';
import QuotationPreview from '@/components/QuotationPreview';

const blank = () => ({ name: '', quantity: 1, rate: '' });

// client-uploaded image wins; otherwise newest default for the event type; otherwise an "any type" default
async function resolveTheme(ev) {
  if (ev.themes) return { theme: ev.themes, source: 'client' };
  const { data: defaults } = await supabase
    .from('themes')
    .select('*')
    .eq('is_custom', false)
    .or(`event_type.eq.${ev.type},event_type.is.null`)
    .order('created_at', { ascending: false });
  const pick = defaults?.find((t) => t.event_type === ev.type) || defaults?.[0] || null;
  return { theme: pick, source: pick ? 'default' : 'none' };
}

export default function QuotePage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [theme, setTheme] = useState(null);
  const [themeSource, setThemeSource] = useState('none');
  const [items, setItems] = useState([blank()]);
  const [mode, setMode] = useState('edit');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [lastPdf, setLastPdf] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', date: '', type: 'birthday', title: '' });
  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function openEditor() {
    setForm({
      name: event.clients?.name || '',
      email: event.clients?.email || '',
      date: String(event.date || '').slice(0, 10),
      type: event.type,
      title: event.title || '',
    });
    setMsg({ type: '', text: '' });
    setEditing(true);
  }

  async function saveDetails(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.date) return setMsg({ type: 'error', text: 'Client name and event date are required.' });
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      const c = await supabase
        .from('clients')
        .update({ name: form.name.trim(), email: form.email.trim() || null })
        .eq('id', event.client_id);
      if (c.error) throw c.error;
      const { data: ev, error } = await supabase
        .from('events')
        .update({ date: form.date, type: form.type, title: form.title.trim() || null })
        .eq('id', id)
        .select('*, clients(*), themes(*)')
        .single();
      if (error) throw error;
      setEvent(ev);
      const t = await resolveTheme(ev);
      setTheme(t.theme);
      setThemeSource(t.source);
      setEditing(false);
      setMsg({ type: 'ok', text: 'Details updated. Generate the PDF again to get a new copy with these changes.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Could not update the details.' });
    }
    setBusy(false);
  }

  useEffect(() => {
    (async () => {
      const { data: ev, error } = await supabase
        .from('events')
        .select('*, clients(*), themes(*)')
        .eq('id', id)
        .single();
      if (error || !ev) {
        setMsg({ type: 'error', text: 'Quotation not found.' });
        return setLoading(false);
      }
      setEvent(ev);

      const t = await resolveTheme(ev);
      setTheme(t.theme);
      setThemeSource(t.source);

      const { data: existing } = await supabase
        .from('items').select('*').eq('event_id', id).order('position');
      if (existing?.length) {
        setItems(existing.map((r) => ({ name: r.name, quantity: r.quantity, rate: r.rate })));
      }
      setLoading(false);
    })();
  }, [id]);

  const clean = useMemo(
    () =>
      items
        .filter((i) => i.name.trim() && Number(i.quantity) > 0)
        .map((i) => ({ name: i.name.trim(), quantity: Math.floor(Number(i.quantity)), rate: Number(i.rate) || 0 })),
    [items]
  );
  const total = useMemo(() => clean.reduce((s, i) => s + i.quantity * i.rate, 0), [clean]);

  const update = (idx, k, v) => setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));
  const remove = (idx) => setItems((arr) => (arr.length === 1 ? [blank()] : arr.filter((_, i) => i !== idx)));

  async function saveItems() {
    const del = await supabase.from('items').delete().eq('event_id', id);
    if (del.error) throw del.error;
    if (clean.length) {
      const { error } = await supabase
        .from('items')
        .insert(clean.map((c, i) => ({ event_id: id, name: c.name, quantity: c.quantity, rate: c.rate, position: i })));
      if (error) throw error;
    }
  }

  async function saveDraft() {
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      await saveItems();
      setMsg({ type: 'ok', text: 'Items saved.' });
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
    setBusy(false);
  }

  async function generate() {
    if (!clean.length) return setMsg({ type: 'error', text: 'Add at least one item with a name.' });
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      await saveItems();
      const { buildQuotationPdf } = await import('@/lib/pdf');
      const blob = await buildQuotationPdf({
        event, client: event.clients, items: clean, themeUrl: theme?.image_url, total,
      });

      const path = `${id}/${Date.now()}.pdf`;
      const up = await supabase.storage.from('quotations').upload(path, blob, { contentType: 'application/pdf' });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from('quotations').getPublicUrl(path);

      const { error } = await supabase
        .from('quotations')
        .insert({ event_id: id, total_amount: total, pdf_url: pub.publicUrl });
      if (error) throw error;

      const fileName = `Quotation-${event.clients?.name || 'client'}-${event.date}.pdf`.replace(/[^\w.-]+/g, '_');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);

      setLastPdf(pub.publicUrl);
      setMsg({ type: 'ok', text: 'Quotation saved and downloaded.' });
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Could not generate the PDF.' });
    }
    setBusy(false);
  }

  if (loading) return <p className="text-sm">Loading…</p>;
  if (!event) return <p role="alert" className="text-red-700">{msg.text} <Link className="underline" href="/">Start a new one</Link></p>;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-pine">{eventTitle(event)}</h1>
          <p className="text-sm text-ink/70">
            {event.clients?.name} · {fmtDate(event.date)} ·{' '}
            <button type="button" onClick={editing ? () => setEditing(false) : openEditor} className="font-semibold text-gold underline">
              {editing ? 'Cancel editing details' : 'Edit client / event details'}
            </button>
          </p>
        </div>
        <div className="inline-flex rounded-md border border-gold/50 bg-white p-0.5" role="tablist">
          {['edit', 'preview'].map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded px-4 py-1.5 text-sm font-semibold ${mode === m ? 'bg-pine text-glow' : 'text-pine'}`}
            >
              {m === 'edit' ? 'Edit items' : 'Preview'}
            </button>
          ))}
        </div>
      </div>

      {editing && (
        <form onSubmit={saveDetails} className="panel mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="d-name">Client name</label>
              <input id="d-name" required value={form.name} onChange={setF('name')} />
            </div>
            <div>
              <label htmlFor="d-email">Client email (optional)</label>
              <input id="d-email" type="email" value={form.email} onChange={setF('email')} />
            </div>
            <div>
              <label htmlFor="d-date">Date of function</label>
              <input id="d-date" type="date" required value={form.date} onChange={setF('date')} />
            </div>
            <div>
              <label htmlFor="d-type">Event type</label>
              <select id="d-type" value={form.type} onChange={setF('type')}>
                {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="d-title">Quotation heading (optional)</label>
            <input id="d-title" value={form.title} onChange={setF('title')} placeholder={`${typeLabel(form.type)} Décor — e.g. 1st Birthday Décor`} />
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save details'}</button>
            <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}

      {mode === 'edit' ? (
        <div className="panel mt-6">
          <div className="hidden grid-cols-[1fr_90px_130px_120px_40px] gap-3 pb-1 sm:grid">
            <label>Item</label><label>Nos</label><label>Rate (₹)</label><label className="text-right">Amount</label><span />
          </div>
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_90px_130px_120px_40px] sm:items-center">
                <input
                  className="col-span-2 sm:col-span-1" aria-label="Item name" placeholder="e.g. Pastel balloon arch"
                  value={it.name} onChange={(e) => update(idx, 'name', e.target.value)}
                />
                <input type="number" min="1" step="1" aria-label="Nos" value={it.quantity}
                  onChange={(e) => update(idx, 'quantity', e.target.value)} />
                <input type="number" min="0" step="0.01" aria-label="Rate" placeholder="0" value={it.rate}
                  onChange={(e) => update(idx, 'rate', e.target.value)} />
                <div className="text-right text-sm font-semibold tabular-nums text-pine">
                  ₹ {inr((Number(it.quantity) || 0) * (Number(it.rate) || 0))}
                </div>
                <button type="button" onClick={() => remove(idx)} aria-label="Remove item"
                  className="justify-self-end rounded px-2 py-1 text-lg text-red-700 hover:bg-red-50">×</button>
              </div>
            ))}
          </div>

          <button type="button" className="btn-ghost mt-4" onClick={() => setItems((a) => [...a, blank()])}>
            + Add item
          </button>

          <div className="mt-6 flex items-center justify-between rounded-md bg-pine px-4 py-3 text-glow">
            <span className="font-bold tracking-wide">GRAND TOTAL</span>
            <span className="text-lg font-bold tabular-nums">₹ {inr(total)}</span>
          </div>

          <p className="mt-3 text-xs text-ink/60">
            Theme: {themeSource === 'client' ? 'client-uploaded image' : themeSource === 'default' ? `default — ${theme?.name}` : 'none available (an admin can upload one under Admin)'}
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <QuotationPreview event={event} client={event.clients} items={clean} themeUrl={theme?.image_url} total={total} />
        </div>
      )}

      {msg.text && (
        <p role="status" className={`mt-4 rounded-md px-3 py-2 text-sm ${msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>
          {msg.text} {lastPdf && msg.type === 'ok' && <a className="underline" href={lastPdf} target="_blank" rel="noreferrer">Open saved PDF</a>}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn-gold" onClick={generate} disabled={busy}>
          {busy ? 'Working…' : 'Generate & download PDF'}
        </button>
        <button className="btn-ghost" onClick={saveDraft} disabled={busy}>Save items</button>
        {mode === 'edit'
          ? <button className="btn-ghost" onClick={() => setMode('preview')}>Preview</button>
          : <button className="btn-ghost" onClick={() => setMode('edit')}>Back to editing</button>}
      </div>
    </div>
  );
}
