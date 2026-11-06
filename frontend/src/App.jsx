import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Loading, Empty } from './components/States';
import { useApp } from './utils/AppContext';
import MenuPage from './pages/MenuPage';
import LoginPage from './pages/LoginPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import KitchenPage from './pages/KitchenPage';
import AdminMenuPage from './pages/AdminMenuPage';
import DashboardPage from './pages/DashboardPage';
import PartyPage from './pages/PartyPage';

function ProtectedRoute({ roles, children }) {
  const { user, authLoading } = useApp();
  const location = useLocation();
  if (authLoading) return <Loading />;
  if (!user)
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (roles && !roles.includes(user.role))
    return (
      <Empty
        title="This is a staff workspace."
        text="You can follow your orders from your own account."
        link="/orders"
        action="View my orders"
      />
    );
  return children;
}
export default function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Navbar />
      <div id="main-content">
        <Routes>
          <Route path="/" element={<MenuPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage key="register" register />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/party" element={<PartyPage />} />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderTrackingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kitchen"
            element={
              <ProtectedRoute roles={['kitchen', 'admin']}>
                <KitchenPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/menu"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminMenuPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={['admin', 'kitchen']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              <Empty
                title="This table isn’t set yet."
                text="That page doesn’t exist. Let’s take you back to the menu."
              />
            }
          />
        </Routes>
      </div>
      <Footer />
    </>
  );
}
