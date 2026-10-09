import { COMPANY, TERMS, inr, fmtDate, eventTitle } from '@/lib/constants';
import HangingLights from '@/components/HangingLights';

export default function QuotationPreview({ event, client, items, themeUrl, total }) {
  return (
    <div className="overflow-x-auto">
      <div className="mx-auto min-w-[640px] max-w-[794px] bg-cream shadow-sm">
        <HangingLights className="block h-auto w-full" />
        <div className="mx-2 mb-2 border border-gold p-2">
        <div className="border border-gold p-6">
          <div className="flex items-start justify-between gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="RareLuxe Premium Rentals" className="h-24 w-auto" />
            <div className="text-right text-[11px] leading-snug">
              <div className="text-sm font-bold text-pine">{COMPANY.name}</div>
              {COMPANY.lines.map((l) => <div key={l}>{l}</div>)}
            </div>
          </div>

          <div className="mt-6 bg-pine py-2 text-center font-serif text-lg font-bold tracking-[0.4em] text-glow">
            QUOTATION
          </div>

          <div className="mt-3 grid grid-cols-2 gap-y-3 border border-gold p-3 text-sm">
            {[
              ['CLIENT NAME', client?.name],
              ['EVENT TYPE', eventTitle(event)],
              ['EVENT DATE', fmtDate(event?.date)],
              ['QUOTATION DATE', new Date().toLocaleDateString('en-GB')],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[10px] font-bold text-gold">{k}</div>
                <div className="font-bold text-pine">{v}</div>
              </div>
            ))}
          </div>

          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gold text-left text-[11px] font-bold text-white">
                <th className="w-10 px-3 py-2 text-center">#</th>
                <th className="px-3 py-2">DESCRIPTION</th>
                <th className="w-20 px-3 py-2 text-center">QTY</th>
                <th className="w-28 px-3 py-2 text-right">RATE (₹)</th>
                <th className="w-32 px-3 py-2 text-right">AMOUNT (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className={i % 2 ? 'bg-band' : 'bg-white'}>
                  <td className="px-3 py-2 text-center">{i + 1}</td>
                  <td className="px-3 py-2">{it.name}</td>
                  <td className="px-3 py-2 text-center">{it.quantity}</td>
                  <td className="px-3 py-2 text-right">{inr(it.rate)}</td>
                  <td className="px-3 py-2 text-right">{inr(it.quantity * it.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end gap-10 border-t border-gold bg-white px-3 py-2 text-sm font-bold text-pine">
            <span>SUB TOTAL</span>
            <span className="w-32 text-right">{inr(total)}</span>
          </div>
          <div className="flex justify-end gap-10 bg-pine px-3 py-2 text-sm font-bold text-glow">
            <span>GRAND TOTAL (₹)</span>
            <span className="w-32 text-right">{inr(total)}</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <div className="mb-2 text-xs font-bold text-pine">THEME REFERENCE</div>
              <div className="flex aspect-[4/3] items-center justify-center border border-gold bg-white">
                {themeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={themeUrl} alt="Theme reference" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs italic text-gray-400">No theme image selected</span>
                )}
              </div>
            </div>
            <div className="flex flex-col justify-between">
              <div>
                <div className="mb-2 text-xs font-bold text-pine">TERMS &amp; CONDITIONS</div>
                <ol className="space-y-1 text-[11px]">
                  {TERMS.map((t, i) => <li key={i}>{i + 1}. {t}</li>)}
                </ol>
              </div>
              <div className="text-right">
                {/* blank space for a hand signature */}
                <div className="h-14" />
                <div className="ml-auto w-4/5 border-t border-gold pt-1 text-[11px]">
                  <div className="font-bold text-pine">{COMPANY.signatory}</div>
                  <div>{COMPANY.signatureCaption}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 text-center font-serif text-sm font-bold text-pine">{COMPANY.thankYou}</div>
        </div>
        </div>
      </div>
    </div>
  );
}
