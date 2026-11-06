import { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppContext as Context } from './AppContextStore';
import { authService } from '../services/authService';
import { menuService } from '../services/menuService';
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
export function AppProvider({ children }) {
  const [user, setUser] = useState(null),
    [authLoading, setAuthLoading] = useState(true);
  const [cart, setCart] = useState(() => read('dum.cart', []));
  const [outletId, setOutletId] = useState(() => read('dum.outlet', ''));
  const [menu, setMenu] = useState({ items: [], outlets: [], outlet: null });
  const [menuLoading, setMenuLoading] = useState(true),
    [menuError, setMenuError] = useState('');
  const [notice, setNotice] = useState(null),
    [revision, setRevision] = useState(0),
    [connected, setConnected] = useState(false);
  const toastTimer = useRef();
  const notify = useCallback((message, type = 'success') => {
    setNotice({ message, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setNotice(null), 5000);
  }, []);
  const refreshUser = useCallback(async () => {
    try {
      const data = await authService.me();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);
  const refreshMenu = useCallback(async () => {
    setMenuError('');
    try {
      setMenu(await menuService.list(outletId));
    } catch (e) {
      setMenuError(e.message);
    } finally {
      setMenuLoading(false);
    }
  }, [outletId]);
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);
  useEffect(() => {
    if (user?.role === 'kitchen' && user.outlet) setOutletId(user.outlet);
  }, [user?.role, user?.outlet]);
  useEffect(() => {
    refreshMenu();
  }, [refreshMenu]);
  useEffect(() => {
    localStorage.setItem('dum.cart', JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    localStorage.setItem('dum.outlet', JSON.stringify(outletId));
  }, [outletId]);
  useEffect(() => {
    if (!user) {
      setConnected(false);
      return;
    }
    let socket,
      retry,
      closed = false;
    const connect = () => {
      const base = import.meta.env.VITE_API_URL || window.location.origin;
      socket = new WebSocket(`${base.replace(/^http/, 'ws')}/ws`);
      socket.onopen = () => {
        setConnected(true);
        setRevision((n) => n + 1);
      };
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'menu.changed') refreshMenu();
        if (data.type === 'orders.changed' || data.type === 'party.changed') {
          setRevision((n) => n + 1);
          refreshUser();
        }
      };
      socket.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(connect, 3000);
      };
      socket.onerror = () => socket.close();
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      socket?.close();
    };
  }, [user?.id, refreshMenu, refreshUser]);
  const chooseOutlet = (id) => {
    if (id !== (outletId || menu.outlet?._id) && cart.length) {
      setCart([]);
      notify('Outlet changed. Your bag was cleared so availability stays accurate.');
    }
    setOutletId(id);
  };
  const addToCart = (line) => {
    setCart((current) => {
      const key = `${line.menuItem}:${line.portion}:${[...line.addons].sort().join(',')}`;
      const found = current.find((i) => i.key === key);
      return found
        ? current.map((i) => (i.key === key ? { ...i, quantity: Math.min(20, i.quantity + 1) } : i))
        : [...current, { ...line, key, quantity: 1 }];
    });
    notify('Added to your bag.');
  };
  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setCart([]);
      notify('Signed out.');
    } catch (e) {
      notify(e.message, 'error');
    }
  };
  return (
    <Context.Provider
      value={{
        user,
        setUser,
        authLoading,
        refreshUser,
        cart,
        setCart,
        outletId,
        menu,
        menuLoading,
        menuError,
        refreshMenu,
        chooseOutlet,
        addToCart,
        notify,
        logout,
        revision,
        connected,
      }}
    >
      {children}
      {notice && (
        <div className={`toast ${notice.type}`} role="status">
          {notice.message}
          <button aria-label="Dismiss notification" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
