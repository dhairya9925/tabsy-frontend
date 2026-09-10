import { Calendar, User, X, Filter, Sparkles, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FilterOption, PresetFilter } from '@/hooks/useExpenseFilters';
import { useCategories } from '@/hooks/useCategories';

interface ExpenseFilterBarProps {
  yearOptions: FilterOption[];
  selectedYear: string;
  onYearChange: (val: string) => void;

  monthOptions: FilterOption[];
  selectedMonth: string;
  onMonthChange: (val: string) => void;

  memberOptions: FilterOption[];
  selectedMember: string;
  onMemberChange: (val: string) => void;

  selectedCategory: string;
  onCategoryChange: (val: string) => void;

  searchQuery: string;
  onSearchChange: (val: string) => void;

  activePreset: PresetFilter;
  onApplyPreset: (preset: PresetFilter) => void;

  filteredCount: number;
  totalCount: number;
  filteredTotal: number;
  isFiltered: boolean;
  onClearFilters: () => void;
}

export const ExpenseFilterBar = ({
  yearOptions,
  selectedYear,
  onYearChange,
  monthOptions,
  selectedMonth,
  onMonthChange,
  memberOptions,
  selectedMember,
  onMemberChange,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  activePreset,
  onApplyPreset,
  filteredCount,
  totalCount,
  filteredTotal,
  isFiltered,
  onClearFilters,
}: ExpenseFilterBarProps) => {
  const { categories } = useCategories();

  const presets: { id: PresetFilter; label: string }[] = [
    { id: 'all_time', label: 'All Time' },
    { id: 'current_month', label: 'Current Month' },
    { id: 'this_year', label: 'This Year' },
    { id: 'last_3_months', label: 'Last 90 Days' },
  ];

  return (
    <div className="bg-muted/20 border border-border/50 rounded-xl p-3 space-y-3 mb-4">
      {/* Quick Preset Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium shrink-0 mr-1">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Quick:
        </div>
        {presets.map(p => {
          const isActive = activePreset === p.id;
          return (
            <Badge
              key={p.id}
              variant={isActive ? 'default' : 'outline'}
              className={`cursor-pointer text-[11px] px-2.5 py-0.5 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'bg-background/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground border-border/60'
              }`}
              onClick={() => onApplyPreset(p.id)}
            >
              {p.label}
            </Badge>
          );
        })}
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search expenses by note or description..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="h-8 pl-8 text-xs bg-background/80 border-border/50"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Dropdown Filters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Category Dropdown */}
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="h-9 text-xs bg-background/80">
            <div className="flex items-center gap-1.5 truncate">
              <Filter className="h-3.5 w-3.5 text-primary shrink-0" />
              <SelectValue placeholder="Category" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id} className="text-xs">
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year Dropdown */}
        <Select value={selectedYear} onValueChange={onYearChange}>
          <SelectTrigger className="h-9 text-xs bg-background/80">
            <div className="flex items-center gap-1.5 truncate">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
              <SelectValue placeholder="Year" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Month Dropdown */}
        <Select value={selectedMonth} onValueChange={onMonthChange}>
          <SelectTrigger className="h-9 text-xs bg-background/80">
            <div className="flex items-center gap-1.5 truncate">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
              <SelectValue placeholder="Month" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Member Dropdown */}
        <Select value={selectedMember} onValueChange={onMemberChange}>
          <SelectTrigger className="h-9 text-xs bg-background/80">
            <div className="flex items-center gap-1.5 truncate">
              <User className="h-3.5 w-3.5 text-primary shrink-0" />
              <SelectValue placeholder="Member" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {memberOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter Summary Line + Reset */}
      {isFiltered && (
        <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1.5 border-t border-border/30 gap-1">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-primary" />
            <span>
              Showing <strong className="text-foreground font-medium">{filteredCount}</strong> of{' '}
              {totalCount} expenses
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono-num font-medium text-foreground">
              Total: <strong className="text-primary font-bold">₹{filteredTotal.toFixed(2)}</strong>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-2"
            >
              <X className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseFilterBar;
