import { Link } from 'react-router-dom';
import { Heart, MapPin } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export const ProductCard = ({ product, index = 0 }) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const inWishlist = isInWishlist(product.id);

  const handleWishlistClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please login to add items to wishlist');
      return;
    }
    
    const success = await toggleWishlist(product.id);
    if (success) {
      toast.success(inWishlist ? 'Removed from wishlist' : 'Added to wishlist');
    }
  };

  const conditionColors = {
    'New': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Like New': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Used': 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link to={`/product/${product.id}`} data-testid={`product-card-${product.id}`}>
        <div className="group relative overflow-hidden rounded-2xl glass-card hover:border-violet-500/50 transition-all duration-300 hover:-translate-y-1">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden">
            <img
              src={product.images[0] || 'https://images.unsplash.com/photo-1557821552-17105176677c?q=80&w=1000&auto=format&fit=crop'}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            
            {/* Wishlist Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleWishlistClick}
              data-testid={`wishlist-btn-${product.id}`}
              aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              className={`absolute top-3 right-3 rounded-full backdrop-blur-md transition-all ${
                inWishlist 
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                  : 'bg-black/30 text-white hover:bg-black/50'
              }`}
            >
              <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
            </Button>

            {/* Condition Badge */}
            <Badge 
              className={`absolute top-3 left-3 ${conditionColors[product.condition]} border`}
            >
              {product.condition}
            </Badge>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-violet-400 transition-colors">
                {product.name}
              </h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {product.description}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xl font-bold gradient-text">
                ₹{product.price.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                {product.category}
              </span>
            </div>

            <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{product.seller_name}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
