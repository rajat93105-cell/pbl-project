import { Monitor, Book, Home, Package } from 'lucide-react';
import { motion } from 'framer-motion';

const categories = [
  { name: 'All', icon: Package, value: '' },
  { name: 'Room Essentials', icon: Home, value: 'Room Essentials' },
  { name: 'Books & Study', icon: Book, value: 'Books & Study Material' },
  { name: 'Electronics', icon: Monitor, value: 'Electronics' },
  { name: 'Other Stuff', icon: Package, value: 'Other Useful Stuff' },
];

export const CategoryFilter = ({ selected, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-3">
      {categories.map((category) => {
        const Icon = category.icon;
        const isSelected = selected === category.value;
        
        return (
          <motion.button
            key={category.name}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(category.value)}
            data-testid={`category-${category.value || 'all'}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
              isSelected
                ? 'gradient-primary text-white border-transparent'
                : 'glass-card border-white/10 hover:border-violet-500/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{category.name}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
