import { Home, Plane, Coffee, PartyPopper, Receipt, type LucideIcon } from 'lucide-react';

export interface GroupTypeConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  suggestedCategories: string[];
  description: string;
}

export const GROUP_TYPES: Record<string, GroupTypeConfig> = {
  shared_living: {
    id: 'shared_living',
    label: 'Shared Living',
    icon: Home,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    suggestedCategories: ['bills', 'food', 'shopping'],
    description: 'Roommates, shared apartments, family homes',
  },
  trip: {
    id: 'trip',
    label: 'Trip',
    icon: Plane,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    suggestedCategories: ['food', 'transport', 'shopping'],
    description: 'Vacations, weekend getaways, road trips',
  },
  day_to_day: {
    id: 'day_to_day',
    label: 'Day-to-Day',
    icon: Coffee,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    suggestedCategories: ['food', 'shopping', 'transport', 'other'],
    description: 'Regular friend groups, office lunches',
  },
  event: {
    id: 'event',
    label: 'Event',
    icon: PartyPopper,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    suggestedCategories: ['food', 'shopping', 'other'],
    description: 'Weddings, parties, concerts, festivals',
  },
  reimbursable: {
    id: 'reimbursable',
    label: 'Reimbursable',
    icon: Receipt,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    suggestedCategories: ['food', 'transport', 'other'],
    description: 'Work trips, team lunches, shared expenses',
  },
};

export const getGroupTypeConfig = (id: string): GroupTypeConfig => {
  return GROUP_TYPES[id] || GROUP_TYPES.day_to_day;
};
