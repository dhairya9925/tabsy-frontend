import { Calendar, User, X, Filter, Sparkles, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FilterOption, FriendPresetFilter } from '@/hooks/useFriendExpenseFilters';

interface FriendFilterBarProps {
  yearOptions: FilterOption[];
  selectedYear: string;
  onYearChange: (val: string) => void;

  monthOptions: FilterOption[];
  selectedMonth: string;
  onMonthChange: (val: string) => void;

  payerOptions: FilterOption[];
  selectedPayer: string;
  onPayerChange: (val: string) => void;

  searchQuery: string;
  onSearchChange: (val: string) => void;

  activePreset: FriendPresetFilter;
  onApplyPreset: (preset: FriendPresetFilter) => void;

  filteredCount: number;
  totalCount: number;
  filteredTotal: number;
  isFiltered: boolean;
  onClearFilters: () => void;
}

export const FriendFilterBar = ({
  yearOptions,
  selectedYear,
  onYearChange,
  monthOptions,
  selectedMonth,
  onMonthChange,
  payerOptions,
  selectedPayer,
  onPayerChange,
  searchQuery,
  onSearchChange,
  activePreset,
  onApplyPreset,
  filteredCount,
  totalCount,
  filteredTotal,
  isFiltered,
  onClearFilters,
}: FriendFilterBarProps) => {
  const presets: { id: FriendPresetFilter; label: string }[] = [
    { id: 'all_time', label: 'All Time' },
    { id: 'current_month', label: 'Current Month' },
    { id: 'this_year', label: 'This Year' },
    { id: 'last_3_months', label: 'Last 90 Days' },
  ];

  return (
    <div className="bg-muted/20 border border-border/50 rounded-xl p-3 space-y-3 mb-4">
      {/* Quick Presets Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium shrink-0 mr-1">
          <Sparkles className="h-3 w-3 text-primary" />
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

      {/* Search Bar Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search shared expenses by note or category..."
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

      {/* Dropdowns Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Year Dropdown */}
        <div className="flex-1 min-w-[110px]">
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
        </div>

        {/* Month Dropdown */}
        <div className="flex-1 min-w-[120px]">
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
        </div>

        {/* Payer Dropdown */}
        <div className="flex-1 min-w-[130px]">
          <Select value={selectedPayer} onValueChange={onPayerChange}>
            <SelectTrigger className="h-9 text-xs bg-background/80">
              <div className="flex items-center gap-1.5 truncate">
                <User className="h-3.5 w-3.5 text-primary shrink-0" />
                <SelectValue placeholder="Payer" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {payerOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reset Button */}
        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-9 text-xs text-muted-foreground hover:text-foreground px-2.5 shrink-0"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Summary Line */}
      {isFiltered && (
        <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1.5 border-t border-border/30 gap-1">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-primary" />
            <span>
              Showing <strong className="text-foreground font-medium">{filteredCount}</strong> of{' '}
              {totalCount} items
            </span>
          </div>
          <div className="font-mono-num font-medium text-foreground">
            Filtered Total: <span className="text-primary font-bold">₹{filteredTotal.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendFilterBar;
