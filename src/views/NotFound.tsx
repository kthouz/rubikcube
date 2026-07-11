import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="view">
      <div className="view__header">
        <h1 className="view__title">Page not found</h1>
      </div>
      <p className="view__description">
        That route doesn&apos;t exist yet. Head back to the <Link to="/">home screen</Link>.
      </p>
    </section>
  );
}
