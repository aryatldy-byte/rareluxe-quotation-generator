'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { COMPANY, EVENT_TYPES, MAX_IMAGE_BYTES, typeLabel } from '@/lib/constants';
import HangingLights from '@/components/HangingLights';

export default function StartPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', date: '', type: 'birthday', title: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onFile = (e) => {
    const f = e.target.files?.[0];
    setError('');
    if (!f) return setFile(null);
    if (!f.type.startsWith('image/')) { e.target.value = ''; return setError('Theme must be an image file.'); }
    if (f.size > MAX_IMAGE_BYTES) { e.target.value = ''; return setError('Theme image must be 4 MB or smaller.'); }
    setFile(f);
  };

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data: client, error: cErr } = await supabase
        .from('clients')
        .insert({ name: form.name.trim(), email: form.email.trim() || null })
        .select()
        .single();
      if (cErr) throw cErr;

      let themeId = null;
      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `custom/${crypto.randomUUID()}.${ext || 'jpg'}`;
        const up = await supabase.storage.from('themes').upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        const { data: pub } = supabase.storage.from('themes').getPublicUrl(path);
        const { data: theme, error: tErr } = await supabase
          .from('themes')
          .insert({ name: `${form.name.trim()} — custom theme`, image_url: pub.publicUrl, event_type: form.type, is_custom: true })
          .select()
          .single();
        if (tErr) throw tErr;
        themeId = theme.id;
      }

      const { data: event, error: eErr } = await supabase
        .from('events')
        .insert({
          client_id: client.id,
          date: form.date,
          type: form.type,
          title: form.title.trim() || null,
          theme_id: themeId,
        })
        .select()
        .single();
      if (eErr) throw eErr;

      router.push(`/quote/${event.id}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Check your Supabase setup and try again.');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="-mx-4 -mt-8 mb-6 sm:mx-0 sm:mt-0">
        <HangingLights className="block h-auto w-full" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="RareLuxe Premium Rentals" className="h-20 w-auto" />
        <div className="text-right text-[11px] leading-snug text-ink/80">
          <div className="text-sm font-bold text-pine">{COMPANY.name}</div>
          {COMPANY.lines.map((l) => <div key={l}>{l}</div>)}
        </div>
      </div>
      <div className="my-5 h-px bg-gold/50" />
      <h1 className="font-serif text-3xl font-bold text-pine">Start a quotation</h1>
      <p className="mt-1 text-sm text-ink/70">
        Enter the client and function details. You'll add the décor items on the next screen.
      </p>

      <form onSubmit={submit} className="panel mt-6 space-y-4">
        <div>
          <label htmlFor="name">Client name</label>
          <input id="name" required value={form.name} onChange={set('name')} placeholder="e.g. Fathima Rahman" />
        </div>
        <div>
          <label htmlFor="email">Client email (optional)</label>
          <input id="email" type="email" value={form.email} onChange={set('email')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="date">Date of function</label>
            <input id="date" type="date" required value={form.date} onChange={set('date')} />
          </div>
          <div>
            <label htmlFor="type">Event type</label>
            <select id="type" value={form.type} onChange={set('type')}>
              {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="title">Quotation heading (optional)</label>
          <input id="title" value={form.title} onChange={set('title')} placeholder={`${typeLabel(form.type)} Décor — e.g. 1st Birthday Décor`} />
        </div>
        <div>
          <label htmlFor="theme">Client's theme image (optional)</label>
          <input id="theme" type="file" accept="image/*" onChange={onFile} />
          <p className="mt-1 text-xs text-ink/60">
            Skip this to use the default {typeLabel(form.type).toLowerCase()} theme from the gallery.
          </p>
        </div>

        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Creating…' : 'Continue to quotation builder'}
        </button>
      </form>
    </div>
  );
}
