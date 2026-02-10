'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
  glowColor?: 'cyan' | 'red' | 'orange' | 'yellow';
}

const glowClasses = {
  cyan: 'glow-cyan-hover',
  red: 'glow-critical-hover',
  orange: 'glow-warning-hover',
  yellow: 'glow-warning-hover',
};

export const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ className, hover = true, glow = false, glowColor = 'cyan', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'card-premium',
        hover && 'hover-lift',
        glow && glowClasses[glowColor],
        className
      )}
      {...props}
    />
  )
);
PremiumCard.displayName = 'PremiumCard';

export const AlertCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('alert-card', className)} {...props} />
  )
);
AlertCard.displayName = 'AlertCard';

export const PremiumCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6 border-b border-slate-700/30', className)}
    {...props}
  />
));
PremiumCardHeader.displayName = 'PremiumCardHeader';

export const PremiumCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref as any}
    className={cn(
      'text-lg font-bold tracking-tight bg-linear-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent',
      className
    )}
    {...props}
  />
));
PremiumCardTitle.displayName = 'PremiumCardTitle';

export const PremiumCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-slate-400', className)}
    {...props}
  />
));
PremiumCardDescription.displayName = 'PremiumCardDescription';

export const PremiumCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
PremiumCardContent.displayName = 'PremiumCardContent';

export const PremiumCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center justify-between p-6 pt-0 border-t border-slate-700/30',
      className
    )}
    {...props}
  />
));
PremiumCardFooter.displayName = 'PremiumCardFooter';
