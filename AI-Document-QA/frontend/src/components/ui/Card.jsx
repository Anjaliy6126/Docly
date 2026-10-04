import { cn } from '../../lib/utils'

/**
 * Polished charcoal glass card component with subtle red border glow on hover.
 */
export function Card({ as: Tag = 'div', interactive = false, className, ...props }) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-line bg-surface/75 backdrop-blur-xl shadow-xl',
        interactive &&
          'transition-all duration-200 hover:border-line-luminous hover:shadow-[0_0_25px_rgba(229,9,20,0.18)] hover:-translate-y-0.5 cursor-pointer',
        className
      )}
      {...props}
    />
  )
}
