import { useState } from 'react';

interface PasswordPromptProps {
  onSubmit: (password: string) => Promise<void>;
  error?: string;
}

export function PasswordPrompt({ onSubmit, error }: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      await onSubmit(password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="password-prompt" onSubmit={handleSubmit}>
      <h2>ENTER PASSWORD</h2>
      <p className="subtitle">This dead drop is password-protected.</p>
      <div className="form-group">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          required
        />
      </div>
      {error && <p className="error-text">{error}</p>}
      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? 'DECRYPTING...' : 'UNLOCK'}
      </button>
    </form>
  );
}
