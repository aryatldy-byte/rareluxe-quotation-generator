import Link from 'next/link';

export default function Nav() {
  return (
    <header className="bg-pine">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" aria-label="RareLuxe Premium Rentals — home" className="rounded-md bg-cream px-3 py-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="RareLuxe Premium Rentals" className="h-11 w-auto" />
        </Link>
        <nav className="flex gap-5 text-sm text-white/90">
          <Link href="/" className="hover:text-glow">New quotation</Link>
          <Link href="/quotations" className="hover:text-glow">Saved quotations</Link>
          <Link href="/admin" className="hover:text-glow">Admin</Link>
        </nav>
      </div>
      <div className="h-1 bg-gold" />
    </header>
  );
}
