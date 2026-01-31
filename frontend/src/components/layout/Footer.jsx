import { Link } from 'react-router-dom';
import { Package, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="border-t border-white/5 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-lg">MUJ Marketplace</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md">
              The trusted marketplace for Manipal University Jaipur students. Buy and sell campus essentials with fellow students.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/marketplace" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link to="/add-product" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Sell Item
                </Link>
              </li>
              <li>
                <Link to="/wishlist" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Wishlist
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-4">Categories</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/marketplace?category=Room Essentials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Room Essentials
                </Link>
              </li>
              <li>
                <Link to="/marketplace?category=Books & Study Material" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Books & Study
                </Link>
              </li>
              <li>
                <Link to="/marketplace?category=Electronics" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Electronics
                </Link>
              </li>
              <li>
                <Link to="/marketplace?category=Other Useful Stuff" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Other Stuff
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} MUJ Campus Marketplace. For MUJ students only.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> for MUJ
          </p>
        </div>
      </div>
    </footer>
  );
};
