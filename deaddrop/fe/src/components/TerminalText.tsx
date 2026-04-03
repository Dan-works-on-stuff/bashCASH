import { useTypewriter } from '../hooks/useTypewriter';

interface TerminalTextProps {
  text: string;
  speed?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
}

export function TerminalText({
  text,
  speed = 50,
  as: Tag = 'span',
  className = '',
}: TerminalTextProps) {
  const { displayText, isComplete } = useTypewriter(text, speed);

  return (
    <Tag className={`terminal-text ${className}`}>
      {displayText}
      {!isComplete && <span className="cursor">_</span>}
    </Tag>
  );
}
