'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Search } from 'lucide-react';

interface FiltersBarProps {
  search: string;
  setSearch: (value: string) => void;
  riskFilter: 'all' | 'high' | 'medium' | 'low';
  setRiskFilter: (value: 'all' | 'high' | 'medium' | 'low') => void;
}

export function FiltersBar({
  search,
  setSearch,
  riskFilter,
  setRiskFilter,
}: FiltersBarProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sender, content, department..."
              className="w-full h-10 rounded-md border bg-background pl-9 pr-3 text-sm"
            />
          </div>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as any)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All Risks</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}
