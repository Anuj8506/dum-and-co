import { Plus, Flame } from 'lucide-react';
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
          <button disabled={!item.available} className="add-button" onClick={() => onSelect(item)}>
            Add <Plus size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
