export function EmptyState({ title, description }) {
  return (
    <div className="rounded-[20px] border border-dashed border-white/10 bg-black/10 px-4 py-6 text-center sm:rounded-[22px] sm:px-5 sm:py-7">
      <div className="font-display text-base font-semibold text-white sm:text-lg">{title}</div>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[var(--text-soft)]">{description}</p>
    </div>
  );
}
