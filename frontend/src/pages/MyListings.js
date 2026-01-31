import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Package, Eye } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MyListings() {
  const { user, token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API_URL}/products/user/${user.id}`);
        setProducts(response.data);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProducts();
    }
  }, [user]);

  const handleDelete = async (productId) => {
    setDeleting(productId);
    try {
      await axios.delete(`${API_URL}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success('Product deleted successfully');
    } catch (error) {
      toast.error('Failed to delete product');
    } finally {
      setDeleting(null);
    }
  };

  const conditionColors = {
    'New': 'bg-green-500/20 text-green-400',
    'Like New': 'bg-blue-500/20 text-blue-400',
    'Used': 'bg-orange-500/20 text-orange-400'
  };

  return (
    <div className="min-h-screen py-8" data-testid="my-listings-page">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 right-0 w-96 h-96 bg-violet-600/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold mb-2">
              <span className="gradient-text">My Listings</span>
            </h1>
            <p className="text-muted-foreground">
              Manage your products on the marketplace
            </p>
          </div>
          <Link to="/add-product" data-testid="add-new-listing">
            <Button className="gradient-primary rounded-full text-white gap-2">
              <Plus className="w-5 h-5" />
              Add New Listing
            </Button>
          </Link>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="space-y-4">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card rounded-2xl p-4 sm:p-6"
                data-testid={`listing-${product.id}`}
              >
                <div className="flex gap-4 sm:gap-6">
                  {/* Image */}
                  <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-xl overflow-hidden">
                    <img
                      src={product.images[0] || 'https://images.unsplash.com/photo-1557821552-17105176677c?q=80&w=1000&auto=format&fit=crop'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-lg truncate">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                      </div>
                      <Badge className={conditionColors[product.condition]}>
                        {product.condition}
                      </Badge>
                    </div>
                    
                    <p className="text-2xl font-bold gradient-text mb-3">
                      ₹{product.price.toLocaleString()}
                    </p>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 hidden sm:block">
                      {product.description}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/product/${product.id}`}>
                        <Button variant="outline" size="sm" className="rounded-full gap-2" data-testid={`view-${product.id}`}>
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                      </Link>
                      <Link to={`/edit-product/${product.id}`}>
                        <Button variant="outline" size="sm" className="rounded-full gap-2" data-testid={`edit-${product.id}`}>
                          <Edit2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-full gap-2 text-red-400 border-red-400/30 hover:bg-red-400/10"
                            data-testid={`delete-trigger-${product.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your listing for "{product.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(product.id)}
                              disabled={deleting === product.id}
                              className="bg-red-500 hover:bg-red-600 rounded-full"
                              data-testid={`confirm-delete-${product.id}`}
                            >
                              {deleting === product.id ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full glass-card flex items-center justify-center">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No listings yet</h3>
            <p className="text-muted-foreground mb-6">
              Start selling by creating your first listing
            </p>
            <Link to="/add-product" data-testid="create-first-listing">
              <Button className="gradient-primary rounded-full text-white gap-2">
                <Plus className="w-5 h-5" />
                Create Listing
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
