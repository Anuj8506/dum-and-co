import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Minus,
  Plus,
  ArrowRight,
  LockKeyhole,
  TicketPercent,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { MAX_CART_LINE_QUANTITY, useApp } from '../utils/AppContext';
import { money } from '../utils/format';
import { orderService } from '../services/orderService';
import { Empty } from '../components/States';
export default function CheckoutPage() {
  const { cart, setCart, changeCartQuantity, menu, user, notify, refreshUser } = useApp();
  const [couponInput, setCouponInput] = useState(''),
    [coupon, setCoupon] = useState(''),
    [redeem, setRedeem] = useState(false);
  const [fulfilment, setFulfilment] = useState('pickup'),
    [address, setAddress] = useState(''),
    [location, setLocation] = useState(null),
    [instructions, setInstructions] = useState('');
  const [order, setOrder] = useState(null),
    [method, setMethod] = useState('UPI'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const navigate = useNavigate();
  const key = useMemo(
    () => crypto.randomUUID(),
    [cart, coupon, redeem, fulfilment, address, location, instructions, menu.outlet?._id]
  );
  const subtotal = cart.reduce((s, i) => s + i.unitPaise * i.quantity, 0);
  const discount = coupon ? Math.min(10000, Math.round(subtotal * 0.1)) : 0;
  const points = redeem
    ? Math.min(user?.points || 0, 100, Math.floor((subtotal - discount) / 100))
    : 0;
  const total = subtotal - discount - points * 100;
  const checkout = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await orderService.create({
        outlet: menu.outlet._id,
        idempotencyKey: key,
        items: cart.map(({ menuItem, portion, addons, quantity }) => ({
          menuItem,
          portion,
          addons,
          quantity,
        })),
        coupon,
        redeemPoints: redeem,
        fulfilment,
        deliveryAddress: address,
        ...(location ? { location } : {}),
        instructions,
      });
      setOrder(result.order);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const pay = async (outcome) => {
    setBusy(true);
    setError('');
    try {
      const { order: result } = await orderService.pay(order._id, { outcome, method });
      if (result.paymentStatus !== 'paid') {
        setError('Demo payment declined. Nothing was charged. You can retry.');
        return;
      }
      setCart([]);
      refreshUser();
      notify('Order placed. Your kitchen is on it!');
      navigate(`/orders/${result._id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const locate = () =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(
          (p) => {
            setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
            notify('Delivery location added.');
          },
          () => notify('Location not shared. Choose pickup instead.', 'error'),
          { timeout: 10000 }
        )
      : notify('Geolocation is unavailable.', 'error');
  if (!cart.length)
    return (
      <main className="page">
        <Empty
          title="A little room for something good."
          text="Your bag is empty. Let’s find your next favourite."
        />
      </main>
    );
  return (
    <main className="page">
      <div className="eyebrow">YOUR NEXT GOOD MEAL</div>
      <h1>Your bag.</h1>
      <p className="muted">Fresh from {menu.outlet?.name}. Made just for you.</p>
      <div className="checkout-layout">
        <section className="panel">
          <h2>
            <ShoppingBag size={21} /> A good choice.
          </h2>
          {cart.map((item) => (
            <div className="cart-line" key={item.key}>
              <img src={item.image} alt="" />
              <div>
                <h3>{item.name}</h3>
                <p>
                  {item.portion}
                  {item.addons.length ? ` · ${item.addons.join(', ')}` : ''}
                </p>
                <strong>{money(item.unitPaise)}</strong>
              </div>
              <div className="quantity">
                <button
                  aria-label={`Remove one ${item.name}`}
                  disabled={!!order}
                  onClick={() => changeCartQuantity(item.key, -1)}
                >
                  <Minus size={13} />
                </button>
                <span>{item.quantity}</span>
                <button
                  aria-label={`Add one ${item.name}`}
                  disabled={!!order || item.quantity >= MAX_CART_LINE_QUANTITY}
                  onClick={() => changeCartQuantity(item.key, 1)}
                >
                  <Plus size={13} />
                </button>
              </div>
              <strong>{money(item.unitPaise * item.quantity)}</strong>
            </div>
          ))}
          {!order && (
            <form id="checkout-form" onSubmit={checkout}>
              <h3 className="section-label">How would you like it?</h3>
              <div className="segmented">
                <button
                  type="button"
                  className={fulfilment === 'pickup' ? 'active' : ''}
                  onClick={() => setFulfilment('pickup')}
                >
                  Pick up at kitchen
                </button>
                <button
                  type="button"
                  className={fulfilment === 'delivery' ? 'active' : ''}
                  onClick={() => setFulfilment('delivery')}
                >
                  Delivery (demo)
                </button>
              </div>
              {fulfilment === 'delivery' && (
                <>
                  <label>
                    Delivery address
                    <textarea
                      required
                      minLength={8}
                      maxLength={300}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Use a fictional address for the demo"
                    />
                  </label>
                  <button type="button" className="text-button" onClick={locate}>
                    <MapPin size={15} />
                    {location
                      ? 'Location added — update'
                      : 'Share location to check delivery radius'}
                  </button>
                  <small>Demo delivery has no delivery fee or real rider dispatch.</small>
                </>
              )}
              <label>
                Anything the kitchen should know?
                <textarea
                  maxLength={300}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Special requests (allergy requests require staff confirmation)"
                />
              </label>
            </form>
          )}
          {order && (
            <div className="payment-panel">
              <div className="eyebrow">
                <LockKeyhole size={14} /> DEMO PAYMENT
              </div>
              <h2>One last step.</h2>
              <p>No money will be charged. Choose a method to simulate the payment.</p>
              <div className="segmented">
                {['UPI', 'Card'].map((m) => (
                  <button
                    key={m}
                    className={method === m ? 'active' : ''}
                    onClick={() => setMethod(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <button className="button full" disabled={busy} onClick={() => pay('success')}>
                {busy ? 'Processing…' : `Simulate successful payment · ${money(order.totalPaise)}`}
                <CheckCircle2 size={17} />
              </button>
              <button className="text-button" disabled={busy} onClick={() => pay('failed')}>
                Test a declined payment
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setOrder(null);
                  setError('');
                }}
              >
                Edit bag instead
              </button>
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </section>
        <aside className="panel bill">
          <h2>The little details.</h2>
          <div>
            <span>Item total</span>
            <strong>{money(order?.subtotalPaise ?? subtotal)}</strong>
          </div>
          <div>
            <span>Coupon savings</span>
            <strong className="green">−{money(order?.discountPaise ?? discount)}</strong>
          </div>
          {(order?.pointsRedeemed || points) > 0 && (
            <div>
              <span>Rewards redeemed</span>
              <strong>−{money((order?.pointsRedeemed ?? points) * 100)}</strong>
            </div>
          )}
          <div className="bill-total">
            <span>To pay</span>
            <strong>{money(order?.totalPaise ?? total)}</strong>
          </div>
          <small>
            Includes {money(order?.gstPaise ?? Math.round((total * 5) / 105))} GST (5%). No hidden
            charges.
          </small>
          {!order && (
            <>
              <div className="coupon">
                <TicketPercent size={19} />
                <input
                  aria-label="Coupon code"
                  placeholder="Try DUM10"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                />
                <button
                  onClick={() => {
                    if (couponInput === 'DUM10') {
                      setCoupon('DUM10');
                      notify('10% off, up to ₹100, applied.');
                    } else notify('Use DUM10 for 10% off, up to ₹100.', 'error');
                  }}
                >
                  {coupon ? 'Applied ✓' : 'Apply'}
                </button>
              </div>
              {user && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={redeem}
                    onChange={(e) => setRedeem(e.target.checked)}
                  />
                  Use rewards ({user.points} points available, 1 point = ₹1; max 100 per order).
                </label>
              )}
              {!user ? (
                <Link className="button full" to="/login?next=/checkout">
                  Sign in to checkout <ArrowRight size={16} />
                </Link>
              ) : user.role !== 'customer' ? (
                <p className="form-error">Please use a customer account to place an order.</p>
              ) : (
                <button
                  className="button full"
                  type="submit"
                  form="checkout-form"
                  disabled={busy || !menu.outlet}
                >
                  {busy ? 'Checking your order…' : 'Continue to payment'}
                  <ArrowRight size={16} />
                </button>
              )}
            </>
          )}
          <div className="bill-note">
            <HeartIcon />
            Every direct order means more for the people who make your food.
          </div>
        </aside>
      </div>
    </main>
  );
}
function HeartIcon() {
  return <span aria-hidden="true">♡</span>;
}
