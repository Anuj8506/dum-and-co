import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Check, ChefHat, ShoppingBag, Clock3, ArrowLeft, AlertCircle } from 'lucide-react';
import { useApp } from '../utils/AppContext';
import { orderService } from '../services/orderService';
import { money, time, label } from '../utils/format';
import { Loading, ErrorState } from '../components/States';
export default function OrderTrackingPage() {
  const { id } = useParams();
  const { revision, connected, notify, refreshUser } = useApp();
  const [order, setOrder] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      orderService
        .get(id)
        .then((d) => {
          setOrder(d.order);
          setError('');
        })
        .catch((e) => setError(e.message)),
    [id]
  );
  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load, revision]);
  const resume = async () => {
    setBusy(true);
    try {
      await orderService.pay(id, { outcome: 'success', method: 'UPI' });
      await load();
      refreshUser();
      notify('Demo payment successful.');
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  if (error)
    return (
      <main className="page">
        <ErrorState message={error} retry={load} />
      </main>
    );
  if (!order)
    return (
      <main className="page">
        <Loading />
      </main>
    );
  const stages = ['confirmed', 'preparing', 'ready', 'handed_off'];
  const current = stages.indexOf(order.status);
  return (
    <main className="page tracking">
      <Link className="back-link" to="/orders">
        <ArrowLeft size={15} /> All orders
      </Link>
      <div className="tracking-header">
        <div>
          <div className="eyebrow">{order.number}</div>
          <h1>
            {order.status === 'handed_off'
              ? 'Enjoy every bite.'
              : order.status === 'cancelled'
                ? 'Order cancelled.'
                : order.status === 'ready'
                  ? 'Your feast is ready.'
                  : 'Good things are cooking.'}
          </h1>
          <p className="muted">
            {order.outlet?.name} ·{' '}
            {order.fulfilment === 'pickup' ? 'Kitchen pickup' : 'Demo delivery'}
          </p>
        </div>
        <span className={`live-pill ${connected ? '' : 'offline'}`}>
          <i />
          {connected ? 'Live updates' : 'Reconnecting · checks every 15s'}
        </span>
      </div>
      {order.lateNotifiedAt && !['ready', 'handed_off', 'cancelled'].includes(order.status) && (
        <div className="late-notice">
          <AlertCircle size={19} />
          We’re running behind. The outlet team has been alerted and will update your time.
        </div>
      )}
      {order.status === 'awaiting_payment' && (
        <div className="panel">
          <h2>Payment is waiting.</h2>
          <p>This is a demo. No money will be charged.</p>
          <button className="button" disabled={busy} onClick={resume}>
            Simulate successful UPI payment · {money(order.totalPaise)}
          </button>
        </div>
      )}
      <div className="checkout-layout">
        <section className="panel">
          <div className="tracking-promise">
            <ChefHat size={35} />
            <div>
              <small>
                {order.fulfilment === 'pickup' ? 'PROMISED PICKUP' : 'PROMISED READY TIME'}
              </small>
              <h2>{time(order.promisedAt)}</h2>
            </div>
            <span className={`status-badge ${order.status}`}>{label(order.status)}</span>
          </div>
          <div className="timeline">
            {stages.map((stage, i) => (
              <div key={stage} className={i <= current ? 'done' : ''}>
                <span>{i <= current ? <Check size={16} /> : i + 1}</span>
                <div>
                  <h3>{label(stage)}</h3>
                  <small>{time(order.events.find((e) => e.status === stage)?.at)}</small>
                </div>
              </div>
            ))}
          </div>
          <div className="order-events">
            <h3>From the kitchen</h3>
            {[...order.events].reverse().map((e, i) => (
              <p key={i}>
                <Clock3 size={13} />
                <span>
                  {e.message}
                  <small>{time(e.at)}</small>
                </span>
              </p>
            ))}
          </div>
        </section>
        <aside className="panel bill">
          <h2>
            <ShoppingBag size={20} /> Your order
          </h2>
          {order.items.map((i, k) => (
            <div key={k}>
              <span>
                {i.quantity}× {i.name}
                <small>
                  {i.portion}
                  {i.addons.length ? ` · ${i.addons.join(', ')}` : ''}
                </small>
              </span>
              <strong>{money(i.unitPaise * i.quantity)}</strong>
            </div>
          ))}
          <div>
            <span>Savings & rewards</span>
            <strong>−{money(order.discountPaise + order.pointsRedeemed * 100)}</strong>
          </div>
          <div className="bill-total">
            <span>Total · {order.paymentMethod || 'Unpaid'}</span>
            <strong>{money(order.totalPaise)}</strong>
          </div>
          <small>
            Includes {money(order.gstPaise)} GST.{' '}
            {order.paymentStatus === 'paid' ? 'Demo payment received.' : 'No payment received.'}
          </small>
          {order.instructions && (
            <p>
              <b>Kitchen note:</b> {order.instructions}
            </p>
          )}
          {order.pointsEarned > 0 && (
            <p className="green">You earned {order.pointsEarned} reward points.</p>
          )}
          <div className="bill-note">
            {order.outlet?.address}
            <br />
            FSSAI: {order.outlet?.fssai} (demo placeholder)
          </div>
        </aside>
      </div>
    </main>
  );
}
