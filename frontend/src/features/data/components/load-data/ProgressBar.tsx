interface ProgressBarProps {
  label: string;
  /** 0 to 100 */
  percent: number;
}

export function ProgressBar({ label, percent }: ProgressBarProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div className="h-full bg-primary transition-all duration-200" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
