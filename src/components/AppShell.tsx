import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';

/**
 * Responsive application shell: a sticky header with primary navigation and a
 * main content region that renders the active route via <Outlet />.
 */
export default function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavBar />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>Cube Coach — scan, solve, and learn the Rubik&apos;s cube.</span>
      </footer>
    </div>
  );
}
