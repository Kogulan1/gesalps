"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface AccordionContextType {
  value: string | null;
  onValueChange: (value: string | null) => void;
}

const AccordionContext = React.createContext<AccordionContextType | undefined>(undefined);

export function Accordion({ 
  type = "single", 
  collapsible = true, 
  className, 
  children, 
  ...props 
}: {
  type?: "single" | "multiple";
  collapsible?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [value, setValue] = React.useState<string | null>(null);

  const onValueChange = React.useCallback((newValue: string | null) => {
    if (type === "single") {
      setValue(collapsible ? (value === newValue ? null : newValue) : newValue);
    }
  }, [type, collapsible, value]);

  return (
    <AccordionContext.Provider value={{ value, onValueChange }}>
      <div className={cn("space-y-2", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({ 
  value, 
  className, 
  children, 
  ...props 
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error("AccordionItem must be used within Accordion");
  
  const { value: openValue } = context;
  const isOpen = openValue === value;

  return (
    <div className={cn("border rounded-lg", className)} {...props}>
      {children}
    </div>
  );
}

export function AccordionTrigger({ 
  className, 
  children, 
  ...props 
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error("AccordionTrigger must be used within AccordionItem");
  
  const { value, onValueChange } = context;
  const itemValue = React.useContext(AccordionItemContext);
  if (!itemValue) throw new Error("AccordionTrigger must be used within AccordionItem");

  const isOpen = value === itemValue;

  return (
    <button
      className={cn(
        "flex flex-1 items-center justify-between py-4 px-4 font-medium transition-all hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180",
        className
      )}
      onClick={() => onValueChange(itemValue)}
      {...props}
    >
      {children}
      <svg
        className="h-4 w-4 shrink-0 transition-transform duration-200"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

export function AccordionContent({ 
  className, 
  children, 
  ...props 
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error("AccordionContent must be used within AccordionItem");
  
  const { value } = context;
  const itemValue = React.useContext(AccordionItemContext);
  if (!itemValue) throw new Error("AccordionContent must be used within AccordionItem");

  const isOpen = value === itemValue;

  return (
    <div
      className={cn(
        "overflow-hidden text-sm transition-all",
        isOpen ? "animate-accordion-down" : "animate-accordion-up"
      )}
      style={{
        height: isOpen ? "auto" : 0,
      }}
      {...props}
    >
      <div className={cn("pb-4 pt-0 px-4", className)}>
        {children}
      </div>
    </div>
  );
}

const AccordionItemContext = React.createContext<string | null>(null);

// Update AccordionItem to provide context
const AccordionItemWithContext = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ value, className, children, ...props }, ref) => {
  return (
    <AccordionItemContext.Provider value={value}>
      <AccordionItem value={value} className={className} {...props}>
        {children}
      </AccordionItem>
    </AccordionItemContext.Provider>
  );
});

AccordionItemWithContext.displayName = "AccordionItem";

export { AccordionItemWithContext as AccordionItem };
