import { CopyButton } from './CopyButton';

interface SecretRevealProps {
  secret: string;
  destroyed: boolean;
}

export function SecretReveal({ secret, destroyed }: SecretRevealProps) {
  return (
    <div className={`secret-reveal ${destroyed ? 'destroyed' : ''}`}>
      {destroyed ? (
        <>
          <h2 className="destroyed-title">SECRET DESTROYED</h2>
          <p className="destroyed-text">
            This secret has been permanently deleted.
          </p>
        </>
      ) : (
        <>
          <h2>SECRET REVEALED</h2>
          <div className="secret-content">
            <pre>{secret}</pre>
            <CopyButton text={secret} />
          </div>
        </>
      )}
    </div>
  );
}
