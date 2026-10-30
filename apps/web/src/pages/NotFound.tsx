import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <section className="page narrow">
      <h1 className="h1">Nothing at this address</h1>
      <p>The link may be old. Pick a caliber from the home page to see today's prices.</p>
      <Link className="btn btn-go" to="/">
        See all calibers
      </Link>
    </section>
  );
}
