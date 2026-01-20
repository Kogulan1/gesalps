import { Variants } from "framer-motion";

export const FADE_IN: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
};

export const STAGGER_CONTAINER: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

export const SCALE_ON_TAP = {
    scale: 0.97,
    transition: { duration: 0.1 }
};

export const SLIDE_UP: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 20 } }
};

export const GLASS_PANEL = "bg-white/80 backdrop-blur-md border border-white/20 shadow-xl rounded-xl";
