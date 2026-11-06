import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import { useApp } from '../utils/AppContext';
import { orderService } from '../services/orderService';
import { money, time, label } from '../utils/format';
import { Loading, ErrorState, Empty } from '../components/States';
export default function OrdersPage() {
  const { revision } = useApp();
  const [orders, setOrders] = useState(null),
    [error, setError] = useState('');
  const load = useCallback(
    () =>
      orderService
        .list()
        .then((d) => {
          setOrders(d.orders);
          setError('');
        })
        .catch((e) => setError(e.message)),
    []
  );
  useEffect(() => {
    load();
  }, [load, revision]);
  return (
    <main className="page">
      <div className="eyebrow">FROM OUR KITCHEN, WITH LOVE</div>
      <h1>Your orders.</h1>
      <p className="muted">Follow the good things coming your way.</p>
      {error ? (
        <ErrorState message={error} retry={load} />
      ) : !orders ? (
        <Loading />
      ) : !orders.length ? (
        <Empty
          title="Your first favourite is waiting."
          text="Your orders will appear here once you checkout."
        />
      ) : (
        <div className="orders-list">
          {orders.map((o) => (
            <Link className="panel order-row" to={`/orders/${o._id}`} key={o._id}>
              <div>
                <span className={`status-badge ${o.status}`}>{label(o.status)}</span>
                <h3>
                  {o.number} <ArrowUpRight size={16} />
                </h3>
                <p>{o.items.map((i) => `${i.quantity}× ${i.name}`).join(' · ')}</p>
                <small>
                  {o.outlet?.name} · {time(o.createdAt)}
                </small>
              </div>
              <div>
                <strong>{money(o.totalPaise)}</strong>
                {o.promisedAt && (
                  <p>
                    <Clock3 size={13} /> {time(o.promisedAt)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
