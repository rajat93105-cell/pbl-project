import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { Layout } from "./components/layout/Layout.js";

// Pages
import Landing from "./pages/Landing.js";
import Login from "./pages/Login.js";
import Signup from "./pages/Signup.js";
import Marketplace from "./pages/Marketplace.js";
import ProductDetail from "./pages/ProductDetail.js";
import AddProduct from "./pages/AddProduct.js";
import EditProduct from "./pages/EditProduct.js";
import MyListings from "./pages/MyListings.js";
import Wishlist from "./pages/Wishlist.js";
import Profile from "./pages/Profile.js";
import Dashboard from "./pages/Dashboard.js";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Guest Route Component (redirect if logged in)
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/marketplace" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        
        {/* Guest Only Routes */}
        <Route path="/login" element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        } />
        <Route path="/signup" element={
          <GuestRoute>
            <Signup />
          </GuestRoute>
        } />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/add-product" element={
          <ProtectedRoute>
            <AddProduct />
          </ProtectedRoute>
        } />
        <Route path="/edit-product/:id" element={
          <ProtectedRoute>
            <EditProduct />
          </ProtectedRoute>
        } />
        <Route path="/my-listings" element={
          <ProtectedRoute>
            <MyListings />
          </ProtectedRoute>
        } />
        <Route path="/wishlist" element={
          <ProtectedRoute>
            <Wishlist />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

// Themed Toaster component
const ThemedToaster = () => {
  const { theme } = useTheme();
  return (
    <Toaster 
      position="top-center" 
      theme={theme}
      richColors 
      toastOptions={{
        style: {
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          color: 'hsl(var(--foreground))',
        }
      }}
    />
  );
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <WishlistProvider>
            <AppRoutes />
            <ThemedToaster />
          </WishlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
