import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className = '' }: CopyButtonProps) {
  const { copied, copyToClipboard } = useCopyToClipboard();

  return (
    <button
      type="button"
      className={`copy-btn ${className}`}
      onClick={() => copyToClipboard(text)}
    >
      {copied ? '[COPIED]' : '[COPY]'}
    </button>
  );
}
