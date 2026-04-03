import { useState, useEffect } from 'react';

interface SecretFormProps {
  initialContent?: string;
  onSubmit: (data: {
    content: string;
    password: string;
    email: string;
    expiresIn: '1h' | '24h' | '7d';
  }) => Promise<void>;
}

export function SecretForm({ initialContent = '', onSubmit }: SecretFormProps) {
  const [content, setContent] = useState(initialContent);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [expiresIn, setExpiresIn] = useState<'1h' | '24h' | '7d'>('24h');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialContent) setContent(initialContent);
  }, [initialContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !password || !email) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit({ content: content.trim(), password, email, expiresIn });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create secret');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="secret-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="secret-content">SECRET</label>
        <textarea
          id="secret-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter your secret message..."
          rows={6}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="secret-password">PASSWORD</label>
        <input
          id="secret-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Required to view the secret"
          maxLength={128}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="secret-email">EMAIL</label>
        <input
          id="secret-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Notification email"
          required
        />
      </div>

      <div className="form-group">
        <label>EXPIRES IN</label>
        <div className="expiry-options">
          {(['1h', '24h', '7d'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              className={`expiry-btn ${expiresIn === opt ? 'active' : ''}`}
              onClick={() => setExpiresIn(opt)}
            >
              {opt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? 'ENCRYPTING...' : 'CREATE DEAD DROP'}
      </button>
    </form>
  );
}
