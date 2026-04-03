import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="not-found-page">
      <h1>DEAD DROP NOT FOUND</h1>
      <p>This secret has been destroyed, expired, or never existed.</p>
      <Link to="/" className="submit-btn">
        CREATE A NEW DEAD DROP
      </Link>
    </div>
  );
}
