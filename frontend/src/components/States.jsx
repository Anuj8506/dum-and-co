import { LoaderCircle, UtensilsCrossed, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
export function Loading({ text = 'Getting things ready…' }) {
  return (
    <div className="empty-state" role="status">
      <LoaderCircle className="spin" size={30} />
      <p>{text}</p>
    </div>
  );
}
export function ErrorState({ message, retry }) {
  return (
    <div className="empty-state">
      <p className="error-text" role="alert">
        {message}
      </p>
      {retry && (
        <button className="button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Empty({ title, text, link = '/', action = 'Explore the menu' }) {
  return (
    <div className="empty-state">
      <UtensilsCrossed size={36} />
      <h2>{title}</h2>
      <p>{text}</p>
      {link && (
        <Link className="button" to={link}>
          {action}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
