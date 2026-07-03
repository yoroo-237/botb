import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { CartProvider } from './context/CartContext.jsx'
import { AppProvider, useApp } from './context/AppContext.jsx'
import Header from './components/Header/Header.jsx'
import Footer from './components/Footer/Footer.jsx'
import HomePage from './pages/HomePage/HomePage.jsx'
import CategoryPage from './pages/CategoryPage/CategoryPage.jsx'
import ProductDetailPage from './pages/ProductDetailPage/ProductDetailPage.jsx'
import CartPage from './pages/CartPage/CartPage.jsx'
import CheckoutPage from './pages/CheckoutPage/CheckoutPage.jsx'
import LoginPage from './pages/LoginPage/LoginPage.jsx'
import ProfilePage from './pages/ProfilePage/ProfilePage.jsx'
import WalletPage from './pages/WalletPage/WalletPage.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminUsers from './pages/admin/AdminUsers.jsx'
import AdminUserDetail from './pages/admin/AdminUserDetail.jsx'
import AdminDeposits from './pages/admin/AdminDeposits.jsx'
import AdminTransactions from './pages/admin/AdminTransactions.jsx'
import AdminOrders from './pages/admin/AdminOrders.jsx'
import AdminOrderDetail from './pages/admin/AdminOrderDetail.jsx'
import AdminProducts from './pages/admin/AdminProducts.jsx'
import AdminCategories from './pages/admin/AdminCategories.jsx'
import AdminBrands from './pages/admin/AdminBrands.jsx'
import AdminSupport from './pages/admin/AdminSupport.jsx'
import AdminSupportDetail from './pages/admin/AdminSupportDetail.jsx'
import AdminReviews from './pages/admin/AdminReviews.jsx'
import AdminNews from './pages/admin/AdminNews.jsx'
import AdminFaq from './pages/admin/AdminFaq.jsx'
import AdminGiveaways from './pages/admin/AdminGiveaways.jsx'
import AdminAnalytics from './pages/admin/AdminAnalytics.jsx'
import AdminSettings from './pages/admin/AdminSettings.jsx'
import SupportPage from './pages/SupportPage/SupportPage.jsx'

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0d0d1a', flexDirection: 'column', gap: '16px'
    }}>
      <div style={{
        width: '36px', height: '36px', border: '3px solid #2a2a4a',
        borderTop: '3px solid #503aa8', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ color: '#555', fontSize: '0.9rem' }}>Loading…</span>
    </div>
  )
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loadingAuth } = useApp()
  const location = useLocation()
  if (loadingAuth) return <LoadingScreen />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (adminOnly && !['admin', 'moderator'].includes(user.role)) return <Navigate to="/" replace />
  return children
}

function AdminGuard() {
  return (
    <ProtectedRoute adminOnly>
      <AdminLayout />
    </ProtectedRoute>
  )
}

function PublicLayout({ children }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <AppProvider>
          <Routes>
            {/* Login — accessible sans auth, age gate intégré */}
            <Route path="/login" element={<LoginPage />} />

            {/* Toutes les pages nécessitent une connexion */}
            <Route path="/" element={
              <ProtectedRoute><PublicLayout><HomePage /></PublicLayout></ProtectedRoute>
            } />
            <Route path="/shop" element={
              <ProtectedRoute><PublicLayout><HomePage /></PublicLayout></ProtectedRoute>
            } />
            <Route path="/product-category/:slug" element={
              <ProtectedRoute><PublicLayout><CategoryPage /></PublicLayout></ProtectedRoute>
            } />
            <Route path="/product-category/:parent/:slug" element={
              <ProtectedRoute><PublicLayout><CategoryPage /></PublicLayout></ProtectedRoute>
            } />
            <Route path="/product/:slug" element={
              <ProtectedRoute><PublicLayout><ProductDetailPage /></PublicLayout></ProtectedRoute>
            } />
            <Route path="/cart" element={
              <ProtectedRoute><PublicLayout><CartPage /></PublicLayout></ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute><PublicLayout><CheckoutPage /></PublicLayout></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><PublicLayout><ProfilePage /></PublicLayout></ProtectedRoute>
            } />
            <Route path="/wallet" element={
              <ProtectedRoute><PublicLayout><WalletPage /></PublicLayout></ProtectedRoute>
            } />
            <Route path="/support" element={
              <ProtectedRoute><PublicLayout><SupportPage /></PublicLayout></ProtectedRoute>
            } />

            {/* Admin */}
            <Route path="/mario-dashboard" element={<AdminGuard />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="users/:id" element={<AdminUserDetail />} />
              <Route path="deposits" element={<AdminDeposits />} />
              <Route path="transactions" element={<AdminTransactions />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="brands" element={<AdminBrands />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="support/:id" element={<AdminSupportDetail />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="news" element={<AdminNews />} />
              <Route path="faq" element={<AdminFaq />} />
              <Route path="giveaways" element={<AdminGiveaways />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </CartProvider>
    </BrowserRouter>
  )
}
