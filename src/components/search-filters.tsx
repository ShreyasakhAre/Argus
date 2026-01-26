'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, X, Mail, MessageSquare, Users, Building, DollarSign, Smartphone } from 'lucide-react';
import type { SourceApp } from '@/lib/ml-service';

interface SearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
  departments: string[];
  sourceApps?: SourceApp[];
}

export interface SearchFilters {
  search: string;
  department: string;
  risk_level: string;
  flagged_only: boolean;
  source_app: string;
}

const sourceAppIcons: Record<SourceApp, React.ReactNode> = {
  'Email': <Mail className="w-4 h-4" />,
  'Slack': <MessageSquare className="w-4 h-4" />,
  'Microsoft Teams': <Users className="w-4 h-4" />,
  'HR Portal': <Building className="w-4 h-4" />,
  'Finance System': <DollarSign className="w-4 h-4" />,
  'Internal Mobile App': <Smartphone className="w-4 h-4" />,
};

export function SearchFilters({ onSearch, departments, sourceApps = [] }: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    department: '',
    risk_level: '',
    flagged_only: false,
    source_app: ''
  });

  const handleChange = (key: keyof SearchFilters, value: string | boolean) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onSearch(newFilters);
  };

  const clearFilters = () => {
    const cleared = { search: '', department: '', risk_level: '', flagged_only: false, source_app: '' };
    setFilters(cleared);
    onSearch(cleared);
  };

  const hasFilters = filters.search || filters.department || filters.risk_level || filters.flagged_only || filters.source_app;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          placeholder="Search notifications..."
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
          className="pl-9 bg-zinc-800 border-zinc-700 text-white"
        />
      </div>

      <Select value={filters.source_app} onValueChange={(v) => handleChange('source_app', v)}>
        <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700">
          <SelectValue placeholder="Source App" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          <SelectItem value="all">All Sources</SelectItem>
          {sourceApps.map(app => (
            <SelectItem key={app} value={app}>
              <span className="flex items-center gap-2">
                {sourceAppIcons[app]}
                {app}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.department} onValueChange={(v) => handleChange('department', v)}>
        <SelectTrigger className="w-[150px] bg-zinc-800 border-zinc-700">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          <SelectItem value="all">All Depts</SelectItem>
          {departments.map(d => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.risk_level} onValueChange={(v) => handleChange('risk_level', v)}>
        <SelectTrigger className="w-[130px] bg-zinc-800 border-zinc-700">
          <SelectValue placeholder="Risk Level" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700">
          <SelectItem value="all">All Risks</SelectItem>
          <SelectItem value="High">High</SelectItem>
          <SelectItem value="Medium">Medium</SelectItem>
          <SelectItem value="Low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant={filters.flagged_only ? "default" : "outline"}
        size="sm"
        onClick={() => handleChange('flagged_only', !filters.flagged_only)}
        className={filters.flagged_only ? "bg-red-600 hover:bg-red-700" : "border-zinc-700"}
      >
        <Filter className="w-4 h-4 mr-1" />
        Flagged Only
      </Button>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-zinc-400 hover:text-white">
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
