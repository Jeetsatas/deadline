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
      'inline-flex items-center justify-center font-semibold tracking-wide transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

    const variants = {
      primary:
        'bg-primary text-primary-foreground hover:bg-primary-active shadow-none border border-primary text-white',
      secondary:
        'bg-card text-foreground hover:bg-secondary border border-border',
      outline:
        'border border-border bg-transparent hover:bg-secondary text-foreground hover:text-foreground',
      ghost:
        'hover:bg-secondary text-muted-foreground hover:text-foreground border border-transparent',
      destructive:
        'bg-destructive text-destructive-foreground hover:bg-red-600 shadow-sm border border-red-500/20 text-white',
      subtle:
        'bg-primary/10 text-primary hover:bg-primary/15 border border-primary/20',
    };

    const sizes = {
      sm: 'h-10 px-3 text-xs rounded-md gap-1.5',
      md: 'h-11 px-4 text-sm rounded-md gap-2',
      lg: 'h-12 px-6 text-sm rounded-lg gap-2.5 font-bold',
      icon: 'h-10 w-10 rounded-md p-0 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        type={props.type || 'button'}
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

