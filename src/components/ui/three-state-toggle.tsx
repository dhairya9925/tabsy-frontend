import * as React from "react"
import { cn } from "@/lib/utils"

export interface ThreeStateToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange'> {
    value: 0 | 1 | 2
    onValueChange: (value: 0 | 1 | 2) => void
}

export function ThreeStateToggle({ className, value, onValueChange, disabled, ...props }: ThreeStateToggleProps) {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        onValueChange(((value + 1) % 3) as 0 | 1 | 2);
    }

    // Visual text for screen readers
    const stateLabel = value === 0 ? "Included" : value === 1 ? "Partially Away" : "Fully Away";

    return (
        <button
            type="button"
            role="switch"
            aria-checked={value === 2 ? 'true' : value === 0 ? 'false' : 'mixed'}
            aria-label={stateLabel}
            title={stateLabel}
            onClick={handleClick}
            disabled={disabled}
            className={cn(
                "relative inline-flex h-6 w-[3.25rem] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                value === 0 && "bg-secondary",
                value === 1 && "bg-[#10b77f]",
                value === 2 && "bg-[#ff4444]",
                className
            )}
            {...props}
        >
            <span
                className={cn(
                    "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ease-in-out",
                    value === 0 && "translate-x-0",
                    value === 1 && "translate-x-[14px]",
                    value === 2 && "translate-x-[28px]"
                )}
            />
        </button>
    )
}
