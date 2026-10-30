import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { CaliberSearch } from './CaliberSearch.tsx';

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  const home = pathname === '/';

  return (
    <div className="shell">
      <header className="top">
        <div className="wrap top-inner">
          <Link to="/" className="wordmark" aria-label="PerRound home">
            <svg viewBox="0 0 32 32" aria-hidden="true" className="wordmark-mark">
              <path d="M12 25V12c0-3 1.6-6 4-7.5 2.4 1.5 4 4.5 4 7.5v13z" />
              <rect x="11" y="23" width="10" height="3" rx="1" />
            </svg>
            PerRound
          </Link>
          {!home && <CaliberSearch compact />}
          <nav className="top-nav">
            <NavLink to="/stores">Stores</NavLink>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="foot">
        <div className="wrap">
          <p>
            Prices come from each store's own catalog. A store can change a price before we check again, so the price at
            checkout is the one that counts. <Link to="/stores">How each store charges for shipping</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
