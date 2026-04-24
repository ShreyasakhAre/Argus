'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface EmployeeHeaderProps {
  notSafeCount: number;
  bulkMode: boolean;
  onSetBulkMode: (mode: boolean) => void;
  onRefresh: () => void;
}

export function EmployeeHeader({
  notSafeCount,
  bulkMode,
  onSetBulkMode,
  onRefresh,
}: EmployeeHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Employee Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Review notifications, risks, and scan
          suspicious links or QR codes.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className="text-red-500 border-red-500"
        >
          {notSafeCount ?? 0} Not Safe
        </Badge>

        <Button
          variant={bulkMode ? 'default' : 'outline'}
          onClick={() => onSetBulkMode(!bulkMode)}
        >
          Bulk Mode
        </Button>

        <Button
          variant="outline"
          onClick={onRefresh}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
