export function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold z-10">
      {count > 99 ? "99+" : count}
    </span>
  );
}
