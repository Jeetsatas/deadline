import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'subtle';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none';

    const variants = {
      primary:
        'bg-primary text-primary-foreground hover:bg-orange-600 shadow-sm border border-orange-500/20 text-white font-medium',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-border/80',
      outline:
        'border border-border bg-transparent hover:bg-secondary text-foreground hover:text-foreground',
      ghost:
        'hover:bg-secondary text-muted-foreground hover:text-foreground border border-transparent',
      destructive:
        'bg-destructive text-destructive-foreground hover:bg-red-600 shadow-sm border border-red-500/20 text-white',
      subtle:
        'bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 border border-orange-500/20',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
      md: 'h-9 px-4 text-sm rounded-md gap-2',
      lg: 'h-10 px-5 text-sm rounded-lg gap-2.5 font-semibold',
      icon: 'h-9 w-9 rounded-md p-0 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
