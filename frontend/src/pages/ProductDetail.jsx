import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Heart, Mail, Calendar, ArrowLeft, Tag, Package, User } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`${API_URL}/products/${id}`);
        setProduct(response.data);
      } catch (error) {
        toast.error('Product not found');
        navigate('/marketplace');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, navigate]);

  const handleWishlistClick = async () => {
    if (!user) {
      toast.error('Please login to add items to wishlist');
      return;
    }
    const success = await toggleWishlist(product.id);
    if (success) {
      toast.success(isInWishlist(product.id) ? 'Removed from wishlist' : 'Added to wishlist');
    }
  };

  const conditionColors = {
    'New': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Like New': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Used': 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-6">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const inWishlist = isInWishlist(product.id);
  const isOwner = user?.id === product.seller_id;

  return (
    <div className="min-h-screen py-8" data-testid="product-detail-page">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 right-0 w-96 h-96 bg-violet-600/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 rounded-full"
            data-testid="back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Images */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative aspect-square rounded-2xl overflow-hidden glass-card">
                <img
                  src={product.images[selectedImage] || 'https://images.unsplash.com/photo-1557821552-17105176677c?q=80&w=1000&auto=format&fit=crop'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  data-testid="product-main-image"
                />
                <Badge className={`absolute top-4 left-4 ${conditionColors[product.condition]} border`}>
                  {product.condition}
                </Badge>
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === index 
                          ? 'border-violet-500' 
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      data-testid={`thumbnail-${index}`}
                    >
                      <img src={image} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-6"
          >
            {/* Category */}
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-violet-400">{product.category}</span>
            </div>

            {/* Title & Price */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="product-title">
                {product.name}
              </h1>
              <p className="text-4xl font-bold gradient-text" data-testid="product-price">
                ₹{product.price.toLocaleString()}
              </p>
            </div>

            {/* Description */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-violet-400" />
                Description
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="product-description">
                {product.description}
              </p>
            </div>

            {/* Seller Info */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-violet-400" />
                Seller Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                    {product.seller_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium" data-testid="seller-name">{product.seller_name}</p>
                    <p className="text-sm text-muted-foreground">{product.seller_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Posted {new Date(product.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              {isOwner ? (
                <Link to={`/edit-product/${product.id}`} className="flex-1">
                  <Button 
                    className="w-full gradient-primary rounded-full text-white h-12"
                    data-testid="edit-product-btn"
                  >
                    Edit Listing
                  </Button>
                </Link>
              ) : (
                <>
                  <a 
                    href={`mailto:${product.seller_email}?subject=Interested in: ${product.name}&body=Hi ${product.seller_name},%0D%0A%0D%0AI'm interested in your listing "${product.name}" priced at ₹${product.price}.%0D%0A%0D%0APlease let me know if it's still available.%0D%0A%0D%0AThanks!`}
                    className="flex-1"
                  >
                    <Button 
                      className="w-full gradient-primary rounded-full text-white h-12 gap-2"
                      data-testid="contact-seller-btn"
                    >
                      <Mail className="w-5 h-5" />
                      Contact Seller
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    onClick={handleWishlistClick}
                    className={`h-12 rounded-full px-6 ${
                      inWishlist ? 'text-red-400 border-red-400/50' : ''
                    }`}
                    data-testid="wishlist-btn"
                  >
                    <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
