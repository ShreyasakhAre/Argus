'use client';

import { LinkScanner } from './link-scanner';
import { QRScanner } from './qr-scanner';

export function ScannerTools() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <LinkScanner />
      <QRScanner />
    </div>
  );
}
