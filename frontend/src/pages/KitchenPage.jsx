import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, RefreshCw, Timer, CheckCheck, ArrowRight, AlertTriangle } from 'lucide-react';
import { useApp } from '../utils/AppContext';
import { orderService } from '../services/orderService';
import { menuService } from '../services/menuService';
import { label, time, money } from '../utils/format';
import { Loading, ErrorState } from '../components/States';
import WorkspaceModal from '../components/WorkspaceModal';
export default function KitchenPage() {
  const { user, revision, connected, notify } = useApp();
  const [orders, setOrders] = useState(null),
    [menu, setMenu] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState('');
  const [tab, setTab] = useState('board'),
    [filter, setFilter] = useState('all'),
    [now, setNow] = useState(Date.now()),
    [override, setOverride] = useState(null),
    [minutes, setMinutes] = useState(30),
    [reason, setReason] = useState('');
  const load = useCallback(async () => {
    try {
      const [o, m] = await Promise.all([orderService.list(), menuService.admin()]);
      setOrders(o.orders);
      setMenu(m);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load, revision]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  const update = async (order, data) => {
    setBusy(order._id);
    try {
      await orderService.update(order._id, data);
      setOverride(null);
      setReason('');
      await load();
      notify('Kitchen updated. Customer notified in app.');
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy('');
    }
  };
  const setStock = async (item) => {
    const outlet = user.role === 'admin' ? filter : user.outlet;
    if (outlet === 'all') return notify('Choose an outlet before changing its stock.', 'error');
    const available = !item.unavailableAt.includes(outlet);
    setBusy(item._id);
    try {
      await menuService.availability(item._id, { available: !available, outlet });
      await load();
      notify(`${item.name} ${available ? 'paused' : 'available'} at this outlet.`);
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy('');
    }
  };
  const visible = (orders || []).filter(
    (o) => o.paymentStatus === 'paid' && (filter === 'all' || o.outlet?._id === filter)
  );
  const active = visible.filter((o) => ['confirmed', 'preparing', 'ready'].includes(o.status));
  const late = active.filter((o) => o.status !== 'ready' && new Date(o.promisedAt).getTime() < now);
  const stages = ['confirmed', 'preparing', 'ready'];
  return (
    <main className="workspace">
      <div className="workspace-top">
        <div>
          <div className="eyebrow">THE OTHER SIDE OF THE HANDI</div>
          <h1>
            <ChefHat size={35} /> Kitchen board.
          </h1>
          <p className="muted">
            {user.role === 'admin'
              ? 'Every kitchen, one clear view.'
              : menu?.outlets.find((o) => o._id === user.outlet)?.name}{' '}
            · All times IST
          </p>
        </div>
        <div className="workspace-actions">
          <span className={`live-pill ${connected ? '' : 'offline'}`}>
            <i />
            {connected ? 'Live kitchen' : 'Reconnecting · 15s backup'}
          </span>
          <button className="icon-button" aria-label="Refresh kitchen" onClick={load}>
            <RefreshCw size={18} />
          </button>
          <Link className="button secondary small" to="/admin/dashboard">
            Overview
          </Link>
        </div>
      </div>
      <div className="kitchen-stats">
        <div>
          <span>IN THE KITCHEN</span>
          <strong>{active.length}</strong>
        </div>
        <div>
          <span>ON THE DUM</span>
          <strong>{active.filter((o) => o.status === 'preparing').length}</strong>
        </div>
        <div>
          <span>READY TO GO</span>
          <strong>{active.filter((o) => o.status === 'ready').length}</strong>
        </div>
        <div className={late.length ? 'stat-danger' : ''}>
          <span>PAST PROMISE</span>
          <strong>{late.length}</strong>
        </div>
      </div>
      <div className="workspace-toolbar">
        <div className="segmented">
          <button className={tab === 'board' ? 'active' : ''} onClick={() => setTab('board')}>
            Live orders
          </button>
          <button className={tab === 'stock' ? 'active' : ''} onClick={() => setTab('stock')}>
            Item availability
          </button>
          <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
            Completed & cancelled
          </button>
        </div>
        {user.role === 'admin' && (
          <select
            aria-label="Filter kitchen by outlet"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All outlets</option>
            {menu?.outlets.map((o) => (
              <option key={o._id} value={o._id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {error ? (
        <ErrorState message={error} retry={load} />
      ) : !orders ? (
        <Loading />
      ) : tab === 'board' ? (
        <div className="kitchen-columns">
          {stages.map((stage) => (
            <section className={`kitchen-column ${stage}`} key={stage}>
              <h2>
                <i />
                {label(stage)} <span>{active.filter((o) => o.status === stage).length}</span>
              </h2>
              {active
                .filter((o) => o.status === stage)
                .sort((a, b) => new Date(a.promisedAt) - new Date(b.promisedAt))
                .map((o) => {
                  const diff = Math.ceil((new Date(o.promisedAt).getTime() - now) / 60000);
                  const isLate = diff < 0 && stage !== 'ready';
                  return (
                    <article className={`ticket ${isLate ? 'late' : ''}`} key={o._id}>
                      <div className="ticket-header">
                        <strong>{o.number}</strong>
                        <span>{o.fulfilment === 'pickup' ? 'PICKUP' : 'DELIVERY'}</span>
                      </div>
                      <small>
                        {o.user?.name} · {o.outlet?.name} · {time(o.createdAt)}
                      </small>
                      <div className={`ticket-timer ${isLate ? 'red' : ''}`}>
                        <Timer size={18} />
                        <strong>
                          {isLate
                            ? `${Math.abs(diff)} min late`
                            : stage === 'ready'
                              ? 'Ready for handoff'
                              : `${diff} min left`}
                        </strong>
                        <span>{time(o.promisedAt)}</span>
                      </div>
                      {o.items.map((i, k) => (
                        <div className="ticket-item" key={k}>
                          <b>{i.quantity}×</b>
                          <span>
                            {i.name}
                            <small>
                              {i.portion}
                              {i.addons.length ? ` · ${i.addons.join(', ')}` : ''}
                            </small>
                          </span>
                        </div>
                      ))}
                      {o.instructions && <p className="kitchen-note">Note: {o.instructions}</p>}
                      {o.estimate?.confidence === 'low' && (
                        <p className="warning-text">
                          <AlertTriangle size={13} /> Estimate needs staff review
                        </p>
                      )}
                      {o.lateNotifiedAt && (
                        <p className="warning-text">Manager alert · Customer informed</p>
                      )}
                      <button
                        className="button full"
                        disabled={busy === o._id}
                        onClick={() =>
                          update(o, {
                            status:
                              stage === 'confirmed'
                                ? 'preparing'
                                : stage === 'preparing'
                                  ? 'ready'
                                  : 'handed_off',
                          })
                        }
                      >
                        {stage === 'confirmed'
                          ? 'Start preparing'
                          : stage === 'preparing'
                            ? 'Mark ready'
                            : 'Confirm handoff'}
                        <ArrowRight size={16} />
                      </button>
                      <div className="ticket-actions">
                        <button
                          disabled={busy === o._id}
                          onClick={() => {
                            setOverride(o);
                            setMinutes(30);
                            setReason('');
                          }}
                        >
                          Update promise
                        </button>
                        {stage !== 'ready' && (
                          <button
                            disabled={busy === o._id}
                            onClick={() => {
                              if (
                                window.confirm(
                                  'Cancel this demo order? Customer will be notified and redeemed points returned.'
                                )
                              )
                                update(o, { status: 'cancelled' });
                            }}
                          >
                            Cancel order
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              {!active.some((o) => o.status === stage) && (
                <div className="column-empty">
                  <CheckCheck size={25} />
                  <p>All clear here.</p>
                </div>
              )}
            </section>
          ))}
        </div>
      ) : tab === 'stock' ? (
        <div className="panel stock-list">
          <h2>What’s cooking?</h2>
          <p>Pausing an item updates the customer menu immediately for this outlet.</p>
          {menu?.items.map((item) => {
            const outlet = user.role === 'admin' ? filter : user.outlet;
            const available = !item.unavailableAt.includes(outlet);
            return (
              <div className="stock-row" key={item._id}>
                <img src={item.image} alt="" />
                <div>
                  <h3>{item.name}</h3>
                  <small>{item.category}</small>
                </div>
                <button
                  className={`stock-toggle ${available ? 'on' : ''}`}
                  disabled={busy === item._id || outlet === 'all'}
                  onClick={() => setStock(item)}
                >
                  {available ? 'Available' : 'Paused'}
                  <i />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="panel">
          <h2>Closed tickets</h2>
          {visible
            .filter((o) => ['handed_off', 'cancelled'].includes(o.status))
            .map((o) => (
              <div className="history-row" key={o._id}>
                <b>{o.number}</b>
                <span>{o.outlet?.name}</span>
                <span className={`status-badge ${o.status}`}>{label(o.status)}</span>
                <strong>{money(o.totalPaise)}</strong>
              </div>
            ))}
          {!visible.some((o) => ['handed_off', 'cancelled'].includes(o.status)) && (
            <p className="muted">Completed orders will appear here.</p>
          )}
        </div>
      )}
      {override && (
        <WorkspaceModal onClose={() => setOverride(null)} labelledBy="override-title">
          <section className="panel override-dialog">
            <h2 id="override-title">An honest promise.</h2>
            <p>
              Update {override.number}. The customer will see the new pickup time and your reason.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                update(override, { overrideMinutes: Number(minutes), reason });
              }}
            >
              <label>
                Minutes from now
                <input
                  type="number"
                  min="1"
                  max="180"
                  required
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
              </label>
              <small>The outlet’s minimum preparation time will always be enforced.</small>
              <label>
                Reason
                <textarea
                  required
                  minLength={5}
                  maxLength={200}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="For example: Fresh batch needs a little longer."
                />
              </label>
              <div className="form-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setOverride(null)}
                >
                  Go back
                </button>
                <button disabled={!!busy} className="button">
                  Update & notify
                </button>
              </div>
            </form>
          </section>
        </WorkspaceModal>
      )}
    </main>
  );
}
