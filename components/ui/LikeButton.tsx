'use client';
import { Heart } from 'lucide-react';
import { useLikes } from '@/lib/likes';
import { cn } from '@/lib/utils';

/**
 * Generic LikeButton — small heart with optional count.
 *
 * - targetKey: opaque string identifying what's being liked
 *              (`user:Petrica`, `metric:Petrica:bodyFat`, `thread:abc`, ...)
 * - by: the current viewer's identity (used to record "I liked this")
 * - size: 'sm' (14px) | 'md' (16px) | 'lg' (20px)
 * - mode: 'inline' (icon + count) | 'pill' (rounded background with hover)
 */
export function LikeButton({
  targetKey,
  by,
  size = 'sm',
  mode = 'inline',
  label,
  stopPropagation = true,
  className,
}: {
  targetKey: string;
  by: string;
  size?: 'sm' | 'md' | 'lg';
  mode?: 'inline' | 'pill';
  label?: string;
  stopPropagation?: boolean;
  className?: string;
}) {
  const { toggleLike, likesFor, hasLiked } = useLikes();
  const likes = likesFor(targetKey);
  const iLiked = hasLiked(targetKey, by);
  const sizePx = size === 'sm' ? 12 : size === 'md' ? 14 : 16;

  return (
    <button
      type="button"
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        if (!by) return;
        toggleLike(targetKey, by);
      }}
      aria-pressed={iLiked}
      aria-label={iLiked ? `Retrage like${label ? ` (${label})` : ''}` : `Dă like${label ? ` (${label})` : ''}`}
      disabled={!by}
      className={cn(
        'inline-flex items-center gap-1 font-bold transition-transform active:scale-90 disabled:cursor-not-allowed disabled:opacity-40',
        mode === 'pill'
          ? 'px-2 py-1 rounded-full border'
          : 'rounded-md px-0.5 -mx-0.5 py-0.5',
        size === 'lg' ? 'text-xs' : 'text-[10px]',
        className,
      )}
      style={{
        color: iLiked ? '#ef4444' : 'var(--color-fg-muted)',
        ...(mode === 'pill' ? {
          borderColor: iLiked ? '#ef444466' : 'var(--color-border)',
          background: iLiked ? 'rgba(239, 68, 68, 0.10)' : 'transparent',
        } : {}),
      }}
    >
      <Heart size={sizePx} strokeWidth={2.2} fill={iLiked ? '#ef4444' : 'none'} />
      {likes.length > 0 && <span className="num">{likes.length}</span>}
    </button>
  );
}
