import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Save, X, ImagePlus, Loader2, ArrowLeft } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  'Room Essentials',
  'Books & Study Material',
  'Electronics',
  'Other Useful Stuff'
];

const CONDITIONS = ['New', 'Like New', 'Used'];

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    condition: '',
    description: ''
  });
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`${API_URL}/products/${id}`);
        const product = response.data;
        
        // Check ownership
        if (product.seller_id !== user?.id) {
          toast.error('You can only edit your own products');
          navigate('/my-listings');
          return;
        }

        setFormData({
          name: product.name,
          category: product.category,
          price: product.price.toString(),
          condition: product.condition,
          description: product.description
        });
        setImages(product.images);
      } catch (error) {
        toast.error('Product not found');
        navigate('/my-listings');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchProduct();
    }
  }, [id, user, navigate]);

  const handleImageUpload = async (files) => {
    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setUploading(true);
    const newImages = [];

    for (const file of files) {
      try {
        const sigResponse = await axios.get(`${API_URL}/cloudinary/signature`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const { signature, timestamp, cloud_name, api_key, folder } = sigResponse.data;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', api_key);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        formData.append('folder', folder);

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
          { method: 'POST', body: formData }
        );

        const data = await uploadResponse.json();
        
        if (data.secure_url) {
          newImages.push(data.secure_url);
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            setImages(prev => [...prev, reader.result]);
          };
          reader.readAsDataURL(file);
        }
      } catch (error) {
        console.error('Upload failed:', error);
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
    }
    setUploading(false);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleImageUpload(files);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    setSubmitting(true);

    try {
      await axios.put(`${API_URL}/products/${id}`, {
        ...formData,
        price: parseFloat(formData.price),
        images
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Product updated successfully!');
      navigate('/my-listings');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update listing';
      toast.error(Array.isArray(message) ? message[0]?.msg : message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-1/2 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-60 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8" data-testid="edit-product-page">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-0 w-96 h-96 bg-violet-600/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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

          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Edit Listing</span>
          </h1>
          <p className="text-muted-foreground mb-8">
            Update your product details
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Images */}
            <div className="glass-card rounded-2xl p-6">
              <Label className="mb-4 block">Product Images *</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                    <img src={image} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80"
                      data-testid={`remove-image-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {images.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="aspect-square rounded-lg border-2 border-dashed border-white/10 hover:border-violet-500/50 flex flex-col items-center justify-center gap-2 transition-colors"
                    data-testid="add-image-btn"
                  >
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Add</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Basic Info */}
            <div className="glass-card rounded-2xl p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., HP Laptop 15 inch"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="product-name-input"
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger data-testid="category-select">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Condition *</Label>
                  <Select 
                    value={formData.condition} 
                    onValueChange={(value) => setFormData({ ...formData, condition: value })}
                  >
                    <SelectTrigger data-testid="condition-select">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((cond) => (
                        <SelectItem key={cond} value={cond}>{cond}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="1"
                  placeholder="Enter price"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  data-testid="price-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your item"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="description-input"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting || uploading}
              className="w-full gradient-primary rounded-full text-white h-12"
              data-testid="save-product-btn"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
