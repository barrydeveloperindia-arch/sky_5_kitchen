import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn/ui class helper: merge conditional classes, later Tailwind classes win
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Keyboard support for a clickable element that is not a <button>: Enter / Space press it
export function keyActivate(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.currentTarget.click();
    }
}
