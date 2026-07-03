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

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loadingAuth } = useApp()
  const location = useLocation()
  if (loadingAuth) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', fontSize: '1.2rem' }}>Loading…</div>
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
            {/* Public routes with header/footer */}
            <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
            <Route path="/shop" element={<PublicLayout><HomePage /></PublicLayout>} />
            <Route path="/product-category/:slug" element={<PublicLayout><CategoryPage /></PublicLayout>} />
            <Route path="/product-category/:parent/:slug" element={<PublicLayout><CategoryPage /></PublicLayout>} />
            <Route path="/product/:slug" element={<PublicLayout><ProductDetailPage /></PublicLayout>} />
            <Route path="/cart" element={<PublicLayout><CartPage /></PublicLayout>} />
            <Route path="/checkout" element={<PublicLayout><CheckoutPage /></PublicLayout>} />

            {/* Profile & Wallet — protected */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <PublicLayout><ProfilePage /></PublicLayout>
              </ProtectedRoute>
            } />
            <Route path="/wallet" element={
              <ProtectedRoute>
                <PublicLayout><WalletPage /></PublicLayout>
              </ProtectedRoute>
            } />

            {/* Login — no header/footer */}
            <Route path="/login" element={<LoginPage />} />

            {/* Admin — nested routes rendered in AdminLayout's <Outlet /> */}
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
          </Routes>
        </AppProvider>
      </CartProvider>
    </BrowserRouter>
  )
}
