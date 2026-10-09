# RareLuxe Rentals — Quotation Generator

Next.js 14 (App Router) + Supabase + Tailwind + jsPDF, ready for Vercel.

## What it does

| Area | Route | Notes |
|---|---|---|
| Start page | `/` | Client name, function date, event type dropdown, optional heading, optional client theme image |
| Quotation builder | `/quote/[id]` | Add many items (name, nos, rate), live totals, **Edit / Preview** toggle, **Generate & download PDF** |
| Saved quotations | `/quotations` | History with PDF links, **Edit** and **Delete** |
| Admin | `/admin` | Password login; upload theme images, assign them to an event type, reassign, delete |

**Theme rules:** client-uploaded image wins → otherwise newest admin theme for that event type → otherwise newest theme marked "Any event type" → otherwise a blank placeholder.

**Generate PDF** builds the PDF in the browser (jsPDF), uploads it to the `quotations` storage bucket, inserts a row in `quotations` (`total_amount`, `pdf_url`), and downloads the file.

## 1. Set up Supabase (one time)

1. Open your project → **SQL Editor** → paste all of `supabase/schema.sql` → **Run**.
   This creates the tables (`clients`, `events`, `items`, `quotations`, `themes`), the `event_type` enum, row-level-security policies, and the public storage buckets `themes` and `quotations`.
2. That's it. `items.total` is a generated column (`quantity × rate`).

Schema additions beyond your spec: `themes.event_type` (so admins can assign a theme to an event type), `themes.is_custom` (client uploads vs admin defaults), `events.title` (optional heading such as "1st Birthday Décor"), `items.position` (row order) and `created_at` timestamps.

## 2. Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

`.env.local` is already filled with your Supabase URL and anon key plus a generated admin password. Change `ADMIN_PASSWORD` to something you prefer.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo (`.env.local` is git-ignored, so secrets are not committed).
2. Vercel → **Add New → Project** → import the repo (framework auto-detected as Next.js).
3. Under **Environment Variables** add the values from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET` (any long random string)
   - optional: `SUPABASE_SERVICE_ROLE_KEY`
4. **Deploy.** Open `/admin`, sign in, upload a few theme images, then create a quotation from `/`.

Or with the CLI: `npm i -g vercel && vercel --prod`.

## Notes and limits

- **Rupee symbol:** the PDF's built-in font has no ₹ glyph, so the PDF shows "Rs." (the on-screen preview shows ₹). To get ₹ in the PDF, embed a TTF font with `doc.addFileToVFS` / `doc.addFont` in `lib/pdf.js`.
- **Image size:** uploads are capped at 4 MB (Vercel's request-body limit for the admin upload route is 4.5 MB).
- **Signature:** the PDF/preview leaves blank space above the signature line for a hand signature. The caption name, company address and terms live in `lib/constants.js`.
- **Editing details:** on a quotation page, use *Edit client / event details* to change client name, email, date, event type or heading. Re-generate the PDF afterwards; older saved PDFs are not rewritten.
- **Logo:** the real RareLuxe logo is in `public/logo.png` (used on the web pages and preview) and embedded as base64 in `lib/logoData.js` (used in the PDF). To change it, replace both.
- **PDF layout:** hanging lights, logo, company block, and the bottom-pinned signature / thank-you line follow the sample quotation PDF. Edit `lib/pdf.js` (PDF) and `components/QuotationPreview.js` (on-screen preview).

## Hardening (recommended before real client data goes in)

Because the app has no client login, `schema.sql` lets the public anon key read and write the app tables and buckets. Anyone who finds your site's anon key can read client names and quotations. To tighten:

1. Add `SUPABASE_SERVICE_ROLE_KEY` in Vercel (server-only). Admin theme routes will use it automatically.
2. Add Supabase Auth for staff, change policies from `to anon, authenticated` to `to authenticated`, and route quotation creation through authenticated server routes.
3. Make the `quotations` bucket private and serve signed URLs.
