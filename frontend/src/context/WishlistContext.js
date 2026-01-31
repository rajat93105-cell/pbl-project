import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const { token } = useAuth();

  const fetchWishlist = useCallback(async () => {
    if (!token) {
      setWishlist([]);
      setWishlistIds(new Set());
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWishlist(response.data);
      setWishlistIds(new Set(response.data.map(p => p.id)));
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const addToWishlist = async (productId) => {
    if (!token) return false;
    try {
      await axios.post(`${API_URL}/wishlist/${productId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWishlistIds(prev => new Set([...prev, productId]));
      fetchWishlist();
      return true;
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      return false;
    }
  };

  const removeFromWishlist = async (productId) => {
    if (!token) return false;
    try {
      await axios.delete(`${API_URL}/wishlist/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWishlistIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
      setWishlist(prev => prev.filter(p => p.id !== productId));
      return true;
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      return false;
    }
  };

  const isInWishlist = (productId) => wishlistIds.has(productId);

  const toggleWishlist = async (productId) => {
    if (isInWishlist(productId)) {
      return await removeFromWishlist(productId);
    } else {
      return await addToWishlist(productId);
    }
  };

  return (
    <WishlistContext.Provider value={{ 
      wishlist, 
      wishlistIds,
      addToWishlist, 
      removeFromWishlist, 
      isInWishlist,
      toggleWishlist,
      fetchWishlist 
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
