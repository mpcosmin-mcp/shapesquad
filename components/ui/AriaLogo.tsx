/* eslint-disable @next/next/no-img-element */

/**
 * Aria logo — the official colorful circular mark (leaf/petal segments),
 * cropped from ariasibiu.ro's main logo. Transparent background so it sits
 * on any theme. The black "Aria" wordmark is intentionally dropped (invisible
 * on the dark UI); we pair this icon with our own text label.
 */
export function AriaLogo({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/aria-icon.png"
      alt="Aria"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}
