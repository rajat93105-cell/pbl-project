import { Search, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export const SearchBar = ({ value, onChange, onClear }) => {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search for items..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid="search-input"
        className="pl-12 pr-12 py-6 rounded-full glass-card border-white/10 focus:border-violet-500 text-base"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          data-testid="search-clear"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
