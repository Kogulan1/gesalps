export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
}

export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${className}`}
      style={{
        background: variant === 'outline' ? 'transparent' : 'var(--ges-badge-bg)',
        color: 'var(--ges-badge-fg)',
        borderColor: 'var(--ges-border)'
      }}
      {...props}
    />
  );
}
