import {
  Utensils,
  Car,
  ShoppingBag,
  Receipt,
  MoreHorizontal,
  Info,
  Tag,
  type LucideIcon,
} from 'lucide-react';

export interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string; // Tailwind bg class using semantic tokens
}

/**
 * Default categories available to all users.
 * "system" is hidden from dropdowns and only used internally.
 */
export const CATEGORIES: Category[] = [
  { id: 'food', label: 'Food & Dining', icon: Utensils, color: 'bg-orange-500/20 text-orange-400' },
  { id: 'transport', label: 'Transport', icon: Car, color: 'bg-blue-500/20 text-blue-400' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'bg-pink-500/20 text-pink-400' },
  { id: 'bills', label: 'Bills & Utilities', icon: Receipt, color: 'bg-yellow-500/20 text-yellow-400' },
  { id: 'system', label: 'System', icon: Info, color: 'bg-muted text-muted-foreground' },
  { id: 'other', label: 'Other', icon: MoreHorizontal, color: 'bg-gray-500/20 text-gray-400' },
];

/** Set of built-in category IDs that cannot be deleted by users. */
export const DEFAULT_CATEGORY_IDS = new Set(CATEGORIES.map(c => c.id));

/**
 * Color palette for custom user categories.
 * Each custom category gets a color based on its `color_index` from the DB.
 */
export const CUSTOM_CATEGORY_COLORS = [
  { tw: 'bg-purple-500/20 text-purple-400', chart: 'hsl(270, 60%, 60%)' },
  { tw: 'bg-teal-500/20 text-teal-400', chart: 'hsl(170, 60%, 45%)' },
  { tw: 'bg-cyan-500/20 text-cyan-400', chart: 'hsl(190, 70%, 50%)' },
  { tw: 'bg-red-500/20 text-red-400', chart: 'hsl(0, 70%, 55%)' },
  { tw: 'bg-emerald-500/20 text-emerald-400', chart: 'hsl(150, 60%, 45%)' },
  { tw: 'bg-indigo-500/20 text-indigo-400', chart: 'hsl(230, 60%, 60%)' },
  { tw: 'bg-rose-500/20 text-rose-400', chart: 'hsl(350, 70%, 60%)' },
  { tw: 'bg-amber-500/20 text-amber-400', chart: 'hsl(38, 92%, 50%)' },
  { tw: 'bg-lime-500/20 text-lime-400', chart: 'hsl(80, 60%, 50%)' },
  { tw: 'bg-fuchsia-500/20 text-fuchsia-400', chart: 'hsl(290, 70%, 60%)' },
];

/**
 * Prettify a slug into a human-readable label.
 * "my_custom_cat" → "My Custom Cat"
 */
function prettifySlug(slug: string): string {
  return slug
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get a category by its ID. Works for both default and custom categories.
 *
 * For unknown IDs (e.g. a deleted custom category), returns a generated
 * Category with a generic Tag icon, "Other" color, and a prettified label
 * derived from the slug — so existing expenses always render correctly.
 */
export const getCategoryById = (id: string): Category => {
  const found = CATEGORIES.find((c) => c.id === id);
  if (found) return found;

  // Unknown category — generate a fallback with the slug as label
  return {
    id,
    label: prettifySlug(id),
    icon: Tag,
    color: 'bg-gray-500/20 text-gray-400',
  };
};

/**
 * Build a Category object for a custom user category row.
 */
export function buildCustomCategory(slug: string, name: string, colorIndex: number): Category {
  const palette = CUSTOM_CATEGORY_COLORS[colorIndex % CUSTOM_CATEGORY_COLORS.length];
  return {
    id: slug,
    label: name,
    icon: Tag,
    color: palette.tw,
  };
}

/**
 * Get a chart color for a category. Works for defaults and custom categories.
 */
export function getChartColor(categoryId: string, colorIndex?: number): string {
  const defaultIndex = CATEGORIES.findIndex(c => c.id === categoryId);
  if (defaultIndex >= 0 && defaultIndex < CHART_COLORS.length) {
    return CHART_COLORS[defaultIndex];
  }
  // Custom category — use palette
  const ci = colorIndex ?? 0;
  return CUSTOM_CATEGORY_COLORS[ci % CUSTOM_CATEGORY_COLORS.length].chart;
}

// Colors for Recharts pie chart (matching default categories order)
export const CHART_COLORS = [
  'hsl(30, 80%, 55%)',   // food - orange
  'hsl(210, 80%, 55%)',  // transport - blue
  'hsl(330, 70%, 60%)',  // shopping - pink
  'hsl(45, 90%, 55%)',   // bills - yellow
  'hsl(0, 0%, 40%)',     // system - gray (hidden, but keeps indices aligned)
  'hsl(0, 0%, 50%)',     // other - gray
];
