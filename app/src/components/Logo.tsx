/** 自創 Logo：一條很抽象、看起來像游標的魚 */
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="logo">
      <path d="M3 12c3-5 9-6.5 13-3.2L21 5v14l-5-3.8C12 18.5 6 17 3 12z" fill="currentColor" opacity="0.9" />
      <circle cx="8" cy="11" r="1.2" fill="var(--bg)" />
    </svg>
  );
}
