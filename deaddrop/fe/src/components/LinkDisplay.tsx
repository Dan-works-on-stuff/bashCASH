import { CopyButton } from './CopyButton';

interface LinkDisplayProps {
  link: string;
  onCreateAnother: () => void;
}

export function LinkDisplay({ link, onCreateAnother }: LinkDisplayProps) {
  return (
    <div className="link-display">
      <h2>DEAD DROP CREATED</h2>
      <p className="warning-text">
        This link will work exactly once. Save it now.
      </p>
      <div className="link-row">
        <input type="text" value={link} readOnly className="link-input" />
        <CopyButton text={link} />
      </div>
      <p className="info-text">
        Share this link and the password separately with the recipient.
      </p>
      <button type="button" className="submit-btn" onClick={onCreateAnother}>
        CREATE ANOTHER
      </button>
    </div>
  );
}
