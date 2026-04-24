import type { ReactNode } from 'react';
import './BashCashLayout.css';
interface Props {
  children: ReactNode;
  cashBalance: number;
  accuracyMultiplier: number;
}
export function BashCashLayout({ children, cashBalance, accuracyMultiplier }: Props) {
  return (
    <div className="bashcash-layout">
      <header className="bashcash-header">
        <h1>BashCash</h1>
        <div className="session-info">
          <span className="cash-balance">
            Balance: <span role="img" aria-label="cash">{"\u{1F4B8}"}</span>
            {cashBalance}
          </span>
          <span className="cash-multiplier">Multiplier: {accuracyMultiplier.toFixed(1)}x</span>
        </div>
      </header>
      <main className="bashcash-main">
        {children}
      </main>
    </div>
  );
}