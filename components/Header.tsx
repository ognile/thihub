import React from 'react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-fb-card border-b border-fb-divider h-14 px-4 flex items-center justify-between shadow-sm">
      <Link href="/" className="text-fb-blue text-2xl font-bold tracking-tight">
        facebook
      </Link>
      
      <div className="flex items-center gap-2">
        <button className="w-9 h-9 bg-fb-bg rounded-full flex items-center justify-center hover:bg-fb-hover transition-colors">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-fb-text-main">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>
        <button className="w-9 h-9 bg-fb-bg rounded-full flex items-center justify-center hover:bg-fb-hover transition-colors">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-fb-text-main">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10C22 6.48 17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
