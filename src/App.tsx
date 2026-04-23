import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/app-shell';
import { ProtectedRoute } from './components/protected-route';
import { AdminPage } from './pages/admin-page';
import { AffiliatePage } from './pages/affiliate-page';
import { AuthPage } from './pages/auth-page';
import { CartPage } from './pages/cart-page';
import { DashboardPage } from './pages/dashboard-page';
import { DistributionPage } from './pages/distribution-page';
import { OfferDetailPage } from './pages/offer-detail-page';
import { OrdersPage } from './pages/orders-page';
import { ProductsPage } from './pages/products-page';
import { ShopsPage } from './pages/shops-page';
import { UserPage } from './pages/user-page';

export function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="user" element={<UserPage />} />
        <Route path="shops" element={<ShopsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:offerId" element={<OfferDetailPage />} />
        <Route path="distribution" element={<DistributionPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="affiliate" element={<AffiliatePage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
