import * as React from "react"
import { Tooltip as RadixTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip"

export function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
    return (
        <TooltipProvider>
            <RadixTooltip>
                <TooltipTrigger asChild>{children}</TooltipTrigger>
                <TooltipContent className="bg-zinc-900 text-white px-2 py-1 rounded shadow-lg text-sm">
                    {content}
                </TooltipContent>
            </RadixTooltip>
        </TooltipProvider>
    );
}
