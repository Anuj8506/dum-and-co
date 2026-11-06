import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '../utils/AppContext';
import api from '../services/api';
export default function PartyPage() {
  const { user, menu, revision } = useApp();
  const [guests, setGuests] = useState(20),
    [date, setDate] = useState(''),
    [notes, setNotes] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState(false),
    [requests, setRequests] = useState([]);
  useEffect(() => {
    if (user)
      api
        .get('/admin/party')
        .then((d) => setRequests(d.requests))
        .catch(() => {});
  }, [user, done, revision]);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/admin/party', {
        outlet: menu.outlet._id,
        guests: Number(guests),
        date: new Date(date).toISOString(),
        notes,
      });
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="page party-page">
      <section className="party-intro">
        <div className="eyebrow">EVERY CELEBRATION NEEDS A HANDI</div>
        <h1>
          Bring your people.
          <br />
          <em>We’ll bring the feast.</em>
        </h1>
        <p>
          From office lunches to big family moments, we make feeding a crowd feel like coming home.
        </p>
        <img src="/images/hero.jpg" alt="A feast of Hyderabadi biryani" />
        <small>
          For 10 or more guests · At least 48 hours’ notice · Staff confirmation required
        </small>
      </section>
      <section className="panel party-form">
        {done ? (
          <div className="empty-state">
            <CheckCircle2 size={40} />
            <h2>We’ve saved you a place.</h2>
            <p>Your enquiry is with our catering team. Check its status below.</p>
            <button className="button secondary" onClick={() => setDone(false)}>
              Plan another gathering
            </button>
          </div>
        ) : (
          <>
            <h2>Tell us what’s cooking.</h2>
            <p>Requesting for {menu.outlet?.name}. Change your kitchen in the header.</p>
            {!user ? (
              <Link className="button" to="/login?next=/party">
                Sign in to plan a feast
                <ArrowRight size={16} />
              </Link>
            ) : user.role !== 'customer' ? (
              <p>Customer accounts can create requests. Staff can manage them in Overview.</p>
            ) : (
              <form onSubmit={submit}>
                <label>
                  Number of guests
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    required
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                  />
                </label>
                <label>
                  When’s the gathering? (your local time)
                  <input
                    type="datetime-local"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <label>
                  A little about the occasion
                  <textarea
                    required
                    minLength={5}
                    maxLength={1000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Occasion, food preferences, dietary needs…"
                  />
                </label>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <button className="button full" disabled={busy || !menu.outlet}>
                  {busy ? 'Sending…' : 'Send a party request'}
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
          </>
        )}
        {requests.length > 0 && (
          <div className="party-history">
            <h3>Your requests</h3>
            {requests.map((r) => (
              <div key={r._id}>
                <b>
                  {r.guests} guests · {new Date(r.date).toLocaleDateString('en-IN')}
                </b>
                <span className="status-badge">{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
