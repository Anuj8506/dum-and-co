import { Link, NavLink } from 'react-router-dom';
import { CookingPot, ShoppingBag, ArrowUpRight, LogOut } from 'lucide-react';
import { useApp } from '../utils/AppContext';
import OutletPicker from './OutletPicker';
export default function Navbar() {
  const { user, cart, logout } = useApp();
  return (
    <header className="navbar">
      <div className="nav-inner">
        <Link to="/" className="brand">
          <CookingPot size={32} strokeWidth={1.6} />
          <span>
            Dum <i>&</i> Co.<small>THE HYDERABADI KITCHEN</small>
          </span>
        </Link>
        <OutletPicker />
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            Our menu
          </NavLink>
          <NavLink to="/party">
            Party orders <ArrowUpRight size={12} />
          </NavLink>
          {user && <NavLink to="/orders">My orders</NavLink>}
          {user?.role !== 'customer' && user && <NavLink to="/kitchen">Kitchen</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin/menu">Manage</NavLink>}
        </nav>
        <div className="nav-actions">
          {user ? (
            <button
              className="icon-button logout"
              title={`Sign out ${user.name}`}
              aria-label="Sign out"
              onClick={logout}
            >
              <LogOut size={18} />
            </button>
          ) : (
            <Link className="login-link" to="/login">
              Sign in
            </Link>
          )}
          <Link className="bag-button" to="/checkout">
            <ShoppingBag size={17} />
            <span>Bag</span>
            <b>{cart.reduce((s, i) => s + i.quantity, 0)}</b>
          </Link>
        </div>
      </div>
    </header>
  );
}
