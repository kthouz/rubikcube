import { Link } from 'react-router-dom';

const features = [
  {
    to: '/scan',
    emoji: '📷',
    title: 'Scan',
    blurb: 'Capture each face of your cube with the camera to build its current state.',
  },
  {
    to: '/solve',
    emoji: '🧠',
    title: 'Solve',
    blurb: 'Compute an optimal solution and step through the moves one at a time.',
  },
  {
    to: '/tutorial',
    emoji: '🎓',
    title: 'Tutorial',
    blurb: 'Learn the notation and beginner method with guided, interactive lessons.',
  },
];

export default function Landing() {
  return (
    <section className="landing">
      <div className="landing__hero">
        <h1 className="landing__title">Scan it. Solve it. Learn it.</h1>
        <p className="landing__subtitle">
          Point your camera at a scrambled Rubik&apos;s cube and Cube Coach walks you through
          the solution, move by move.
        </p>
        <Link to="/scan" className="button button--primary">
          Start scanning
        </Link>
      </div>
      <div className="card-grid">
        {features.map(({ to, emoji, title, blurb }) => (
          <Link key={to} to={to} className="card">
            <span className="card__emoji" aria-hidden>
              {emoji}
            </span>
            <h2 className="card__title">{title}</h2>
            <p className="card__blurb">{blurb}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
