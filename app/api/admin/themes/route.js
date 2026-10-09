import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { serverSupabase } from '@/lib/supabaseServer';
import { EVENT_TYPES, MAX_IMAGE_BYTES } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'themes';
const validType = (v) => (v && EVENT_TYPES.some((t) => t.value === v) ? v : null);
const deny = () => NextResponse.json({ error: 'Not authorised' }, { status: 401 });
const fail = (msg, status = 400) => NextResponse.json({ error: msg }, { status });

export async function GET() {
  if (!isAdmin()) return deny();
  const { data, error } = await serverSupabase()
    .from('themes')
    .select('*')
    .eq('is_custom', false)
    .order('created_at', { ascending: false });
  if (error) return fail(error.message, 500);
  return NextResponse.json({ themes: data });
}

export async function POST(req) {
  if (!isAdmin()) return deny();
  const form = await req.formData();
  const file = form.get('file');
  const name = String(form.get('name') || '').trim();
  const eventType = validType(String(form.get('event_type') || ''));

  if (!name) return fail('Give the theme a name.');
  if (!file || typeof file === 'string') return fail('Choose an image to upload.');
  if (!file.type.startsWith('image/')) return fail('Only image files are allowed.');
  if (file.size > MAX_IMAGE_BYTES) return fail('Image must be 4 MB or smaller.');

  const sb = serverSupabase();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `defaults/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || 'jpg'}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const up = await sb.storage.from(BUCKET).upload(path, buf, { contentType: file.type });
  if (up.error) return fail(`Upload failed: ${up.error.message}`, 500);

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
  const { data, error } = await sb
    .from('themes')
    .insert({ name, image_url: pub.publicUrl, event_type: eventType, is_custom: false })
    .select()
    .single();
  if (error) return fail(error.message, 500);
  return NextResponse.json({ theme: data });
}

export async function PATCH(req) {
  if (!isAdmin()) return deny();
  const { id, event_type, name } = await req.json().catch(() => ({}));
  if (!id) return fail('Missing theme id.');
  const patch = {};
  if (event_type !== undefined) patch.event_type = validType(event_type);
  if (name !== undefined && String(name).trim()) patch.name = String(name).trim();
  const { data, error } = await serverSupabase()
    .from('themes').update(patch).eq('id', id).select().single();
  if (error) return fail(error.message, 500);
  return NextResponse.json({ theme: data });
}

export async function DELETE(req) {
  if (!isAdmin()) return deny();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return fail('Missing theme id.');
  const sb = serverSupabase();
  const { data: theme } = await sb.from('themes').select('image_url').eq('id', id).single();
  const { error } = await sb.from('themes').delete().eq('id', id);
  if (error) return fail(error.message, 500);
  const marker = `/${BUCKET}/`;
  const idx = theme?.image_url?.indexOf(marker) ?? -1;
  if (idx >= 0) {
    await sb.storage.from(BUCKET).remove([theme.image_url.slice(idx + marker.length)]);
  }
  return NextResponse.json({ ok: true });
}
