import { useState, useEffect } from 'react';
import {
  Search,
  ArrowDown,
  Clock3,
  Leaf,
  Heart,
  ArrowRight,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../utils/AppContext';
import MenuCard from '../components/MenuCard';
import ItemModal from '../components/ItemModal';
import { Loading, ErrorState } from '../components/States';
import api from '../services/api';
const categories = [
  'All favourites',
  'Biryani',
  'Starters',
  'Curries & sides',
  'Desserts',
  'Drinks',
];
export default function MenuPage() {
  const { menu, menuLoading, menuError, refreshMenu, chooseOutlet, notify, user, revision } =
    useApp();
  const [category, setCategory] = useState('All favourites'),
    [query, setQuery] = useState(''),
    [veg, setVeg] = useState(false),
    [selected, setSelected] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    if (user?.role !== 'customer' || !menu.outlet) {
      setSuggestions([]);
      return;
    }
    api
      .get('/menu/recommendations', { params: { outlet: menu.outlet._id } })
      .then((d) => setSuggestions(d.suggestions))
      .catch(() => setSuggestions([]));
  }, [user?.id, user?.role, menu.outlet?._id, revision]);
  const locate = () => {
    if (!navigator.geolocation)
      return notify('Location is unavailable. Choose your outlet in the header.', 'error');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const data = await api.get('/menu/nearest', {
            params: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
          chooseOutlet(data.outlet._id);
          notify(`Your nearest kitchen is ${data.outlet.name}.`);
        } catch (e) {
          notify(e.message, 'error');
        }
      },
      () => notify('Location was not shared. You can choose your outlet manually.', 'error'),
      { timeout: 10000 }
    );
  };
  const filtered = menu.items.filter(
    (i) =>
      (category === 'All favourites' || i.category === category) &&
      (!veg || i.vegetarian) &&
      `${i.name} ${i.description}`.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span /> FROM OUR HANDI TO YOUR HOME
          </div>
          <h1>
            Good things
            <br />
            take <em>dum.</em>
          </h1>
          <p>
            Sealed with tradition. Slow-cooked with love.
            <br />
            Your Hyderabadi favourites, straight from our kitchen.
          </p>
          <a className="button hero-button" href="#menu">
            Find your favourite <ArrowDown size={17} />
          </a>
          <div className="hero-notes">
            <span>
              <Clock3 size={15} /> Freshly prepared
            </span>
            <span>
              <Heart size={15} /> Better when you order direct
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <img
            src="/images/hero.jpg"
            alt="Fragrant Hyderabadi biryani with aromatic basmati rice"
            fetchPriority="high"
          />
          <div className="hero-stamp">
            <span>THE REAL</span>
            <strong>Hyderabadi</strong>
            <span>LOVE AFFAIR</span>
          </div>
          <div className="hero-caption">
            <span>THE HOUSE FAVOURITE</span>
            <strong>
              Chicken dum biryani <ArrowRight size={18} />
            </strong>
          </div>
        </div>
      </section>
      <section className="promise-strip">
        <div>
          <Leaf size={20} />
          <span>
            Real ingredients.<small>No shortcuts in our kitchen.</small>
          </span>
        </div>
        <div>
          <CookingIcon />
          <span>
            Slow is our secret.<small>Every layer deserves its time.</small>
          </span>
        </div>
        <div>
          <Heart size={20} />
          <span>
            A little more rewarding.<small>Earn points on direct orders.</small>
          </span>
        </div>
      </section>
      {suggestions.length > 0 && (
        <section className="recommendation-section">
          <div className="eyebrow">A LITTLE SOMETHING FAMILIAR</div>
          <h2>Your kind of good.</h2>
          <p>Inspired by your past orders. Choose a dish to make it yours.</p>
          <div className="food-grid">
            {suggestions.map((s) => {
              const item = menu.items.find((i) => i._id === s.id);
              return item ? <MenuCard key={item._id} item={item} onSelect={setSelected} /> : null;
            })}
          </div>
        </section>
      )}
      <section className="menu-section" id="menu">
        <div className="section-heading">
          <div>
            <div className="eyebrow">SOMETHING FOR EVERY CRAVING</div>
            <h2>The good stuff.</h2>
            <p>Old favourites. New cravings. Always made with heart.</p>
          </div>
          <div className="search-box">
            <Search size={18} />
            <input
              aria-label="Search the menu"
              placeholder="Find your favourite…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search">
                ×
              </button>
            )}
          </div>
        </div>
        <div className="menu-toolbar">
          <div className="category-tabs" aria-label="Menu categories">
            {categories.map((c) => (
              <button
                key={c}
                className={category === c ? 'active' : ''}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="veg-toggle">
            <input type="checkbox" checked={veg} onChange={(e) => setVeg(e.target.checked)} />
            <Leaf size={15} /> Veg only
          </label>
        </div>
        <div className="menu-location">
          <span>
            <MapPin size={14} /> Prepared at <b>{menu.outlet?.name || 'your local kitchen'}</b>
          </span>
          <button onClick={locate}>
            Find nearest kitchen <ArrowRight size={13} />
          </button>
        </div>
        {menuLoading ? (
          <Loading text="Opening the kitchen…" />
        ) : menuError ? (
          <ErrorState message={menuError} retry={refreshMenu} />
        ) : filtered.length ? (
          <div className="food-grid">
            {filtered.map((item) => (
              <MenuCard key={item._id} item={item} onSelect={setSelected} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <SlidersHorizontal />
            <h3>No dishes found</h3>
            <p>Try another search or switch off the vegetarian filter.</p>
            <button
              className="button secondary"
              onClick={() => {
                setQuery('');
                setVeg(false);
                setCategory('All favourites');
              }}
            >
              Show all dishes
            </button>
          </div>
        )}
        <p className="menu-fineprint">
          Prices include 5% GST · Photos are illustrative · Please tell us about allergies before
          ordering.
        </p>
      </section>
      <section className="party-banner">
        <div>
          <div className="eyebrow">MORE PEOPLE, MORE BIRYANI</div>
          <h2>Your people. Our handi.</h2>
          <p>Office lunches, family celebrations, and every excuse to get together.</p>
        </div>
        <Link to="/party" className="button cream">
          Let’s plan a feast <ArrowRight size={17} />
        </Link>
      </section>
      {menu.outlet && (
        <div className="licence-line">
          {menu.outlet.name} · {menu.outlet.address} · FSSAI: {menu.outlet.fssai} (demo placeholder)
        </div>
      )}
      {selected && (
        <ItemModal key={selected._id} item={selected} onClose={() => setSelected(null)} />
      )}
    </main>
  );
}
function CookingIcon() {
  return (
    <span style={{ fontSize: 23 }} aria-hidden="true">
      ♨
    </span>
  );
}
