import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/app-shell';
import { ProtectedRoute } from './components/protected-route';
import { AdminPage } from './pages/admin-page';
import { AffiliatePage } from './pages/affiliate-page';
import { AuthPage } from './pages/auth-page';
import { CartPage } from './pages/cart-page';
import { DashboardPage } from './pages/home-page';
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
      <Route path="/" element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route
          path="cart"
          element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="user"
          element={
            <ProtectedRoute>
              <UserPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="shops"
          element={
            <ProtectedRoute>
              <ShopsPage />
            </ProtectedRoute>
          }
        />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:offerId" element={<OfferDetailPage />} />
        <Route
          path="distribution"
          element={
            <ProtectedRoute>
              <DistributionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="distribution/shipments/:shipmentId"
          element={
            <ProtectedRoute>
              <DistributionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/:orderId"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="affiliate"
          element={
            <ProtectedRoute>
              <AffiliatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
