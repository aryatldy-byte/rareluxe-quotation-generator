'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { inr, fmtDate, eventTitle } from '@/lib/constants';

export default function QuotationsPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  async function remove(q) {
    const name = q.events?.clients?.name || 'this client';
    const ok = window.confirm(
      `Delete the quotation for ${name} (₹ ${inr(q.total_amount)})?\n\n` +
      'The saved PDF is removed. If it is the last quotation for this event, the event, its items and the client record are removed too. This cannot be undone.'
    );
    if (!ok) return;
    setDeleting(q.id);
    setError('');
    try {
      // 1. remove the stored PDF file
      const marker = '/object/public/quotations/';
      const idx = q.pdf_url ? q.pdf_url.indexOf(marker) : -1;
      if (idx !== -1) {
        await supabase.storage.from('quotations').remove([decodeURIComponent(q.pdf_url.slice(idx + marker.length))]);
      }

      // 2. remove the quotation row
      const del = await supabase.from('quotations').delete().eq('id', q.id);
      if (del.error) throw del.error;

      // 3. if no other quotation uses this event, clean up the event (items cascade) and an unused client
      const { count } = await supabase
        .from('quotations').select('id', { count: 'exact', head: true }).eq('event_id', q.event_id);
      if (!count) {
        const themeMarker = '/object/public/themes/';
        const theme = q.events?.themes;
        if (theme?.is_custom && theme.image_url?.includes(themeMarker)) {
          await supabase.storage.from('themes').remove([decodeURIComponent(theme.image_url.split(themeMarker)[1])]);
        }
        await supabase.from('events').delete().eq('id', q.event_id);
        if (theme?.is_custom) await supabase.from('themes').delete().eq('id', theme.id);
        const clientId = q.events?.client_id;
        if (clientId) {
          const { count: others } = await supabase
            .from('events').select('id', { count: 'exact', head: true }).eq('client_id', clientId);
          if (!others) await supabase.from('clients').delete().eq('id', clientId);
        }
      }

      setRows((r) => r.filter((x) => x.id !== q.id && (count ? true : x.event_id !== q.event_id)));
    } catch (e) {
      setError(e.message || 'Could not delete the quotation.');
    }
    setDeleting(null);
  }

  useEffect(() => {
    supabase
      .from('quotations')
      .select('*, events(*, clients(*), themes(*))')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => (error ? setError(error.message) : setRows(data)));
  }, []);

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-pine">Saved quotations</h1>
      {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
      {!rows && !error && <p className="mt-4 text-sm">Loading…</p>}
      {rows && rows.length === 0 && (
        <p className="mt-4 text-sm">Nothing here yet. <Link className="underline" href="/">Create your first quotation.</Link></p>
      )}
      {rows && rows.length > 0 && (
        <div className="panel mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-gold text-left text-xs text-white">
              <tr>
                <th className="px-4 py-2">Client</th><th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Event date</th><th className="px-4 py-2 text-right">Total (₹)</th>
                <th className="px-4 py-2">Created</th><th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((q, i) => (
                <tr key={q.id} className={i % 2 ? 'bg-band' : ''}>
                  <td className="px-4 py-2 font-semibold text-pine">{q.events?.clients?.name}</td>
                  <td className="px-4 py-2">{q.events ? eventTitle(q.events) : ''}</td>
                  <td className="px-4 py-2">{fmtDate(q.events?.date)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{inr(q.total_amount)}</td>
                  <td className="px-4 py-2">{new Date(q.created_at).toLocaleDateString('en-GB')}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    {q.pdf_url && <a className="font-semibold text-pine underline" href={q.pdf_url} target="_blank" rel="noreferrer">PDF</a>}
                    <Link className="ml-4 text-gold underline" href={`/quote/${q.event_id}`}>Edit</Link>
                    <button
                      type="button"
                      onClick={() => remove(q)}
                      disabled={deleting === q.id}
                      className="ml-4 font-semibold text-red-700 underline disabled:opacity-50"
                    >
                      {deleting === q.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
