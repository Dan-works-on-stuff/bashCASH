import { useState } from 'react';
import { generateSecret } from '../api/client';

interface AiPromptProps {
  onGenerated: (content: string) => void;
}

export function AiPrompt({ onGenerated }: AiPromptProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await generateSecret(prompt.trim());
      onGenerated(result.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-prompt">
      <label htmlFor="ai-prompt-input">AI ASSIST</label>
      <div className="ai-prompt-row">
        <input
          id="ai-prompt-input"
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what to generate..."
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleGenerate();
          }}
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
        >
          {loading ? 'GENERATING...' : 'GENERATE'}
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
