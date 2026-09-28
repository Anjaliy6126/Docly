import { cn } from '../../lib/utils'

/**
 * Layered surface card following the Stitch design system:
 * tonal layering (surface -> raised -> nested), subtle borders,
 * brighter cyan-influenced border on hover. No heavy shadows.
 */
export function Card({ as: Tag = 'div', interactive = false, className, ...props }) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-line bg-surface',
        interactive &&
          'transition-colors duration-150 hover:border-line-luminous cursor-pointer',
        className,
      )}
      {...props}
    />
  )
}
