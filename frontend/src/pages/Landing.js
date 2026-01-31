import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { ArrowRight, ShoppingBag, Shield, Users, Monitor, Book, Home, Package } from 'lucide-react';

const categories = [
  { 
    name: 'Electronics', 
    icon: Monitor, 
    image: 'https://images.unsplash.com/photo-1608148118722-56da485f9e84?crop=entropy&cs=srgb&fm=jpg&q=85&w=400',
    description: 'Laptops, phones, accessories'
  },
  { 
    name: 'Books & Study Material', 
    icon: Book, 
    image: 'https://images.unsplash.com/photo-1581019055756-93b5361f9536?crop=entropy&cs=srgb&fm=jpg&q=85&w=400',
    description: 'Textbooks, notes, calculators'
  },
  { 
    name: 'Room Essentials', 
    icon: Home, 
    image: 'https://images.unsplash.com/photo-1553172366-55b235a466f6?crop=entropy&cs=srgb&fm=jpg&q=85&w=400',
    description: 'Furniture, bedding, decor'
  },
  { 
    name: 'Other Useful Stuff', 
    icon: Package, 
    image: 'https://images.unsplash.com/photo-1516894780606-8d6bf03297cf?crop=entropy&cs=srgb&fm=jpg&q=85&w=400',
    description: 'Cycles, bags, equipment'
  },
];

const features = [
  {
    icon: Shield,
    title: 'Verified Students Only',
    description: 'Only MUJ students with valid university email can join'
  },
  {
    icon: ShoppingBag,
    title: 'Curated Categories',
    description: 'Only campus-relevant items, no spam or junk'
  },
  {
    icon: Users,
    title: 'Campus Community',
    description: 'Trade with trusted fellow students safely'
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="relative overflow-hidden">
      {/* Background Gradient Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]" />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-2 rounded-full glass-card text-violet-400 text-sm font-medium mb-6">
                🎓 Exclusive for MUJ Students
              </span>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Buy & Sell{' '}
                <span className="gradient-text">Campus Essentials</span>
                {' '}with Ease
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                The trusted marketplace for Manipal University Jaipur. 
                Trade textbooks, electronics, room essentials and more with fellow students.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to="/marketplace" data-testid="hero-browse-btn">
                  <Button size="lg" className="gradient-primary rounded-full text-white gap-2 glow-violet-hover">
                    Browse Marketplace
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                {!user && (
                  <Link to="/signup" data-testid="hero-signup-btn">
                    <Button size="lg" variant="outline" className="rounded-full glass-card border-white/10">
                      Join Now
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative w-full aspect-square">
                <div className="absolute inset-0 gradient-primary rounded-3xl opacity-20 blur-3xl animate-pulse-glow" />
                <img
                  src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop"
                  alt="Campus life"
                  className="relative rounded-3xl object-cover w-full h-full shadow-2xl"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="relative py-20" data-testid="categories-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Curated <span className="gradient-text">Categories</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Only relevant campus essentials. No spam, no junk — just what students actually need.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link 
                    to={`/marketplace?category=${encodeURIComponent(category.name)}`}
                    data-testid={`category-card-${category.name}`}
                  >
                    <div className="group relative overflow-hidden rounded-2xl glass-card hover:border-violet-500/50 transition-all duration-300 hover:-translate-y-1">
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={category.image}
                          alt={category.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="font-semibold text-lg text-white">{category.name}</h3>
                        </div>
                        <p className="text-sm text-gray-300">{category.description}</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why <span className="gradient-text">Choose Us</span>?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built specifically for MUJ students, by understanding what campus life truly needs.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card rounded-2xl p-8 text-center hover:border-violet-500/30 transition-all"
                >
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl gradient-primary flex items-center justify-center">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20" data-testid="cta-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl gradient-primary p-12 text-center"
          >
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
            </div>
            
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Start Trading?
              </h2>
              <p className="text-white/80 max-w-xl mx-auto mb-8">
                Join hundreds of MUJ students already using the marketplace. 
                Sign up with your MUJ email and start today!
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {user ? (
                  <Link to="/add-product" data-testid="cta-sell-btn">
                    <Button size="lg" className="bg-white text-violet-600 hover:bg-white/90 rounded-full font-semibold">
                      Start Selling
                    </Button>
                  </Link>
                ) : (
                  <Link to="/signup" data-testid="cta-signup-btn">
                    <Button size="lg" className="bg-white text-violet-600 hover:bg-white/90 rounded-full font-semibold">
                      Sign Up Free
                    </Button>
                  </Link>
                )}
                <Link to="/marketplace" data-testid="cta-browse-btn">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 rounded-full">
                    Browse Items
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
