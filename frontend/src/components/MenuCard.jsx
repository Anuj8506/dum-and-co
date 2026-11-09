import { useRef } from 'react';
import { Minus, Plus, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MAX_CART_LINE_QUANTITY, useApp } from '../utils/AppContext';
import { money } from '../utils/format';
export function DietMark({ vegetarian }) {
  return (
    <span
      title={vegetarian ? 'Vegetarian' : 'Non-vegetarian'}
      className={`diet ${vegetarian ? 'veg' : 'nonveg'}`}
      aria-label={vegetarian ? 'Vegetarian' : 'Non-vegetarian'}
    >
      <i />
    </span>
  );
}
export default function MenuCard({ item, onSelect }) {
  const { cart, changeCartQuantity } = useApp();
  const addButton = useRef(null);
  const lines = cart.filter((line) => line.menuItem === item._id);
  const quantity = lines.reduce((total, line) => total + line.quantity, 0);
  const singleLine = lines.length === 1 ? lines[0] : null;
  const repeatLine =
    item.portions.length === 1 &&
    item.addons.length === 0 &&
    singleLine?.portion === item.portions[0].name &&
    singleLine.addons.length === 0
      ? singleLine
      : null;

  return (
    <article className={`food-card ${!item.available ? 'unavailable' : ''}`}>
      <button
        className="food-image"
        onClick={() => onSelect(item)}
        aria-label={`View ${item.name}`}
      >
        <img src={item.image} alt={item.name} loading="lazy" />
        {item.badge && <span className="food-badge">{item.badge}</span>}
        {!item.available && <span className="sold-out">Currently unavailable</span>}
      </button>
      <div className="food-body">
        <div className="food-meta">
          <DietMark vegetarian={item.vegetarian} />
          <span>{item.vegetarian ? 'VEGETARIAN' : 'NON-VEGETARIAN'}</span>
          <span className="spice">
            <Flame size={11} />
            {item.spice}
          </span>
        </div>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div className="food-bottom">
          <strong>{money(item.pricePaise)}</strong>
          <div className={quantity > 0 ? 'menu-quantity' : undefined}>
            {singleLine && (
              <button
                type="button"
                aria-label={`Remove one ${item.name}`}
                onClick={() => {
                  changeCartQuantity(singleLine.key, -1);
                  if (quantity === 1) addButton.current?.focus({ preventScroll: true });
                }}
              >
                <Minus size={15} aria-hidden="true" />
              </button>
            )}
            {quantity > 0 &&
              (singleLine ? (
                <span className="menu-quantity-count" role="status">
                  {quantity}
                  <span className="sr-only"> {item.name} in bag</span>
                </span>
              ) : (
                <Link
                  to="/checkout"
                  aria-label={`Edit ${quantity} ${item.name} portions in your bag`}
                >
                  {quantity} in bag
                </Link>
              ))}
            <button
              ref={addButton}
              type="button"
              className={quantity === 0 ? 'add-button' : undefined}
              aria-label={repeatLine ? `Add one ${item.name}` : `Add ${item.name}`}
              aria-haspopup={repeatLine ? undefined : 'dialog'}
              disabled={!item.available || repeatLine?.quantity >= MAX_CART_LINE_QUANTITY}
              onClick={() => (repeatLine ? changeCartQuantity(repeatLine.key, 1) : onSelect(item))}
            >
              {quantity === 0 && 'Add'} <Plus size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
