import type { ReactNode } from 'react';
import './Layout.css';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      {/* CRT scanline overlay */}
      <div className="crt-overlay" aria-hidden="true" />

      {/* Header */}
      <header className="layout-header">
        <div className="layout-header-inner">
          <span className="header-prompt" aria-hidden="true">&gt;_</span>
          <h1 className="header-title">DEAD DROP</h1>
        </div>
        <p className="header-subtitle">SELF-DESTRUCTING SECRET SHARING</p>
        <p className="header-api-url">{API_URL}</p>
      </header>

      {/* Main content */}
      <main className="layout-content animate-fade-in">
        {children}
      </main>

      {/* Footer */}
      <footer className="layout-footer">
        <p>
          <span className="footer-cursor animate-blink">_</span>{' '}
          encrypted &middot; ephemeral &middot; secure
        </p>
      </footer>
    </div>
  );
}
