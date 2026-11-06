import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useApp } from '../utils/AppContext';
import { money, label } from '../utils/format';
import { Loading, ErrorState } from '../components/States';
export default function DashboardPage() {
  const { revision, notify } = useApp();
  const [data, setData] = useState(null),
    [requests, setRequests] = useState([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([api.get('/admin/dashboard'), api.get('/admin/party')]);
      setData(d);
      setRequests(p.requests);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load, revision]);
  const reply = async (id, status) => {
    setBusy(id);
    try {
      await api.patch(`/admin/party/${id}`, { status });
      await load();
      notify('Party request updated.');
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy('');
    }
  };
  return (
    <main className="workspace">
      <div className="workspace-top">
        <div>
          <div className="eyebrow">A GOOD DAY IN THE KITCHEN</div>
          <h1>The bigger picture.</h1>
          <p className="muted">Order performance for the records in this demonstration.</p>
        </div>
        <Link to="/kitchen" className="button">
          Open kitchen
        </Link>
      </div>
      {error ? (
        <ErrorState message={error} retry={load} />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <div className="kitchen-stats dashboard-stats">
            {[
              ['Paid orders', data.totalOrders],
              ['Order value', money(data.revenuePaise)],
              [
                'Average prep',
                data.averagePrepMinutes === null ? '—' : `${data.averagePrepMinutes} min`,
              ],
              ['Repeat customers', data.repeatCustomers],
              ['Cancellations', data.cancelled],
            ].map(([name, value]) => (
              <div key={name}>
                <span>{name}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <section className="panel">
            <h2>By kitchen</h2>
            <div className="outlet-summary">
              {data.outlets.map((o) => (
                <div key={o._id}>
                  <h3>{o.name}</h3>
                  <p>
                    {o.totalOrders} orders · {money(o.revenuePaise)}
                  </p>
                  <p>
                    {o.averagePrepMinutes === null
                      ? 'No ready orders yet'
                      : `${o.averagePrepMinutes} min average prep`}{' '}
                    · {o.cancelled} cancellations
                  </p>
                  <p>
                    {o.repeatCustomers} repeat customers · {o.active} active orders
                  </p>
                  <small>{o.address}</small>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <h2>Party requests</h2>
            <p>Confirmation is a staff decision. No quote or payment is sent automatically.</p>
            {requests.length ? (
              requests.map((r) => (
                <div className="party-request" key={r._id}>
                  <div>
                    <h3>
                      {r.name} · {r.guests} guests
                    </h3>
                    <p>
                      {new Date(r.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} ·{' '}
                      {r.outlet?.name}
                    </p>
                    <p>{r.notes}</p>
                  </div>
                  <div>
                    <span className="status-badge">{r.status}</span>
                    {r.status === 'new' && (
                      <div className="form-actions">
                        <button
                          className="button small"
                          disabled={busy === r._id}
                          onClick={() => reply(r._id, 'confirmed')}
                        >
                          Confirm
                        </button>
                        <button
                          className="button secondary small"
                          disabled={busy === r._id}
                          onClick={() => reply(r._id, 'declined')}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No party requests yet.</p>
            )}
          </section>
          <section className="panel">
            <h2>Recent orders</h2>
            {data.orders.map((o) => (
              <div className="history-row" key={o._id}>
                <b>{o.number}</b>
                <span>{o.outlet?.name}</span>
                <span className={`status-badge ${o.status}`}>{label(o.status)}</span>
                <strong>{money(o.totalPaise)}</strong>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
