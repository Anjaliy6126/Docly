import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge conditional class names and resolve Tailwind conflicts.
 * Usage: <div className={cn('p-4', isActive && 'bg-raised', className)} />
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
