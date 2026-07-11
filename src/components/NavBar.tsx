import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/scan', label: 'Scan' },
  { to: '/solve', label: 'Solve' },
  { to: '/tutorial', label: 'Tutorial' },
];

export default function NavBar() {
  return (
    <nav className="navbar" aria-label="Primary">
      <NavLink to="/" className="navbar__brand" end>
        <span aria-hidden className="navbar__logo">
          🧊
        </span>
        Cube Coach
      </NavLink>
      <ul className="navbar__links">
        {links.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                isActive ? 'navbar__link navbar__link--active' : 'navbar__link'
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
