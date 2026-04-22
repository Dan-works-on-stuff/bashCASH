import type { ReactNode } from 'react';
import './BashCashLayout.css';
interface Props {
  children: ReactNode;
}
export function BashCashLayout({ children }: Props) {
  return (
    <div className="bashcash-layout">
      <header className="bashcash-header">
        <h1>BashCash</h1>
        <div className="session-info">
          <span>
            Balance: <span role="img" aria-label="cash">{"\u{1F4B8}"}</span>0
          </span>
        </div>
      </header>
      <main className="bashcash-main">
        {children}
      </main>
    </div>
  );
}