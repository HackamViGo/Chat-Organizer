/**
 * Color utilities for Tailwind CSS classes
 * Following best practices: complete class names as full strings (not dynamic construction)
 */

// Folder colors (hex -> complete Tailwind classes for icon containers)
export const FOLDER_COLOR_CLASSES: Record<string, {
  bg: string;
  bgLight: string;
  text: string;
  textDark: string;
  bgDark: string;
  bgHover: string;
  bgHoverDark: string;
}> = {
  '#ef4444': { // red
    bg: 'bg-red-500',
    bgLight: 'bg-red-100',
    text: 'text-red-600',
    textDark: 'text-red-400',
    bgDark: 'bg-red-500/20',
    bgHover: 'bg-red-200',
    bgHoverDark: 'bg-red-500/30',
  },
  '#f97316': { // orange
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-100',
    text: 'text-orange-600',
    textDark: 'text-orange-400',
    bgDark: 'bg-orange-500/20',
    bgHover: 'bg-orange-200',
    bgHoverDark: 'bg-orange-500/30',
  },
  '#eab308': { // yellow
    bg: 'bg-yellow-500',
    bgLight: 'bg-yellow-100',
    text: 'text-yellow-600',
    textDark: 'text-yellow-400',
    bgDark: 'bg-yellow-500/20',
    bgHover: 'bg-yellow-200',
    bgHoverDark: 'bg-yellow-500/30',
  },
  '#22c55e': { // green
    bg: 'bg-green-500',
    bgLight: 'bg-green-100',
    text: 'text-green-600',
    textDark: 'text-green-400',
    bgDark: 'bg-green-500/20',
    bgHover: 'bg-green-200',
    bgHoverDark: 'bg-green-500/30',
  },
  '#10b981': { // emerald
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-100',
    text: 'text-emerald-600',
    textDark: 'text-emerald-400',
    bgDark: 'bg-emerald-500/20',
    bgHover: 'bg-emerald-200',
    bgHoverDark: 'bg-emerald-500/30',
  },
  '#14b8a6': { // teal
    bg: 'bg-teal-500',
    bgLight: 'bg-teal-100',
    text: 'text-teal-600',
    textDark: 'text-teal-400',
    bgDark: 'bg-teal-500/20',
    bgHover: 'bg-teal-200',
    bgHoverDark: 'bg-teal-500/30',
  },
  '#06b6d4': { // cyan
    bg: 'bg-cyan-500',
    bgLight: 'bg-cyan-100',
    text: 'text-cyan-600',
    textDark: 'text-cyan-400',
    bgDark: 'bg-cyan-500/20',
    bgHover: 'bg-cyan-200',
    bgHoverDark: 'bg-cyan-500/30',
  },
  '#0ea5e9': { // sky
    bg: 'bg-sky-500',
    bgLight: 'bg-sky-100',
    text: 'text-sky-600',
    textDark: 'text-sky-400',
    bgDark: 'bg-sky-500/20',
    bgHover: 'bg-sky-200',
    bgHoverDark: 'bg-sky-500/30',
  },
  '#3b82f6': { // blue
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-100',
    text: 'text-blue-600',
    textDark: 'text-blue-400',
    bgDark: 'bg-blue-500/20',
    bgHover: 'bg-blue-200',
    bgHoverDark: 'bg-blue-500/30',
  },
  '#6366f1': { // indigo (default)
    bg: 'bg-indigo-500',
    bgLight: 'bg-indigo-100',
    text: 'text-indigo-600',
    textDark: 'text-indigo-400',
    bgDark: 'bg-indigo-500/20',
    bgHover: 'bg-indigo-200',
    bgHoverDark: 'bg-indigo-500/30',
  },
  '#8b5cf6': { // violet
    bg: 'bg-violet-500',
    bgLight: 'bg-violet-100',
    text: 'text-violet-600',
    textDark: 'text-violet-400',
    bgDark: 'bg-violet-500/20',
    bgHover: 'bg-violet-200',
    bgHoverDark: 'bg-violet-500/30',
  },
  '#a855f7': { // purple
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-100',
    text: 'text-purple-600',
    textDark: 'text-purple-400',
    bgDark: 'bg-purple-500/20',
    bgHover: 'bg-purple-200',
    bgHoverDark: 'bg-purple-500/30',
  },
  '#d946ef': { // fuchsia
    bg: 'bg-fuchsia-500',
    bgLight: 'bg-fuchsia-100',
    text: 'text-fuchsia-600',
    textDark: 'text-fuchsia-400',
    bgDark: 'bg-fuchsia-500/20',
    bgHover: 'bg-fuchsia-200',
    bgHoverDark: 'bg-fuchsia-500/30',
  },
  '#ec4899': { // pink
    bg: 'bg-pink-500',
    bgLight: 'bg-pink-100',
    text: 'text-pink-600',
    textDark: 'text-pink-400',
    bgDark: 'bg-pink-500/20',
    bgHover: 'bg-pink-200',
    bgHoverDark: 'bg-pink-500/30',
  },
  '#f43f5e': { // rose
    bg: 'bg-rose-500',
    bgLight: 'bg-rose-100',
    text: 'text-rose-600',
    textDark: 'text-rose-400',
    bgDark: 'bg-rose-500/20',
    bgHover: 'bg-rose-200',
    bgHoverDark: 'bg-rose-500/30',
  },
};

// Simple bg-only mapping for backward compatibility
export const FOLDER_BG_COLORS: Record<string, string> = {
  '#ef4444': 'bg-red-500',
  '#f97316': 'bg-orange-500',
  '#eab308': 'bg-yellow-500',
  '#22c55e': 'bg-green-500',
  '#10b981': 'bg-emerald-500',
  '#14b8a6': 'bg-teal-500',
  '#06b6d4': 'bg-cyan-500',
  '#0ea5e9': 'bg-sky-500',
  '#3b82f6': 'bg-blue-500',
  '#6366f1': 'bg-indigo-500',
  '#8b5cf6': 'bg-violet-500',
  '#a855f7': 'bg-purple-500',
  '#d946ef': 'bg-fuchsia-500',
  '#ec4899': 'bg-pink-500',
  '#f43f5e': 'bg-rose-500',
};

// Category colors (string name -> Tailwind classes)
export const CATEGORY_COLOR_CLASSES: Record<string, {
  bg: string;
  bgLight: string;
  text: string;
  textDark: string;
  bgDark: string;
  bgHover: string;
  bgHoverDark: string;
}> = {
  blue: {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-100',
    text: 'text-blue-600',
    textDark: 'text-blue-400',
    bgDark: 'bg-blue-500/20',
    bgHover: 'bg-blue-200',
    bgHoverDark: 'bg-blue-500/30',
  },
  cyan: {
    bg: 'bg-cyan-500',
    bgLight: 'bg-cyan-100',
    text: 'text-cyan-600',
    textDark: 'text-cyan-400',
    bgDark: 'bg-cyan-500/20',
    bgHover: 'bg-cyan-200',
    bgHoverDark: 'bg-cyan-500/30',
  },
  purple: {
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-100',
    text: 'text-purple-600',
    textDark: 'text-purple-400',
    bgDark: 'bg-purple-500/20',
    bgHover: 'bg-purple-200',
    bgHoverDark: 'bg-purple-500/30',
  },
  rose: {
    bg: 'bg-rose-500',
    bgLight: 'bg-rose-100',
    text: 'text-rose-600',
    textDark: 'text-rose-400',
    bgDark: 'bg-rose-500/20',
    bgHover: 'bg-rose-200',
    bgHoverDark: 'bg-rose-500/30',
  },
  emerald: {
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-100',
    text: 'text-emerald-600',
    textDark: 'text-emerald-400',
    bgDark: 'bg-emerald-500/20',
    bgHover: 'bg-emerald-200',
    bgHoverDark: 'bg-emerald-500/30',
  },
  amber: {
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-100',
    text: 'text-amber-600',
    textDark: 'text-amber-400',
    bgDark: 'bg-amber-500/20',
    bgHover: 'bg-amber-200',
    bgHoverDark: 'bg-amber-500/30',
  },
  pink: {
    bg: 'bg-pink-500',
    bgLight: 'bg-pink-100',
    text: 'text-pink-600',
    textDark: 'text-pink-400',
    bgDark: 'bg-pink-500/20',
    bgHover: 'bg-pink-200',
    bgHoverDark: 'bg-pink-500/30',
  },
  red: {
    bg: 'bg-red-500',
    bgLight: 'bg-red-100',
    text: 'text-red-600',
    textDark: 'text-red-400',
    bgDark: 'bg-red-500/20',
    bgHover: 'bg-red-200',
    bgHoverDark: 'bg-red-500/30',
  },
};

/**
 * Get folder background color class from hex color (simple bg only)
 */
export function getFolderColorClass(hexColor: string | null | undefined): string {
  return FOLDER_BG_COLORS[hexColor || '#6366f1'] || 'bg-indigo-500';
}

/**
 * Get folder icon container classes (active/inactive states)
 */
export function getFolderIconContainerClasses(hexColor: string | null | undefined, isActive: boolean): string {
  const colors = FOLDER_COLOR_CLASSES[hexColor || '#6366f1'] || FOLDER_COLOR_CLASSES['#6366f1'];
  if (isActive) {
    return `${colors.bg} text-white shadow-md`;
  }
  return `${colors.bgLight} ${colors.text} dark:${colors.bgDark} dark:${colors.textDark} group-hover:${colors.bgHover} dark:group-hover:${colors.bgHoverDark}`;
}

/**
 * Get category color classes
 */
export function getCategoryColorClasses(color: string) {
  return CATEGORY_COLOR_CLASSES[color] || CATEGORY_COLOR_CLASSES.blue;
}

/**
 * Get category icon container classes (for active/inactive states)
 */
export function getCategoryIconContainerClasses(color: string, isActive: boolean): string {
  const colors = getCategoryColorClasses(color);
  if (isActive) {
    return `${colors.bg} text-white shadow-md`;
  }
  return `${colors.bgLight} ${colors.text} dark:${colors.bgDark} dark:${colors.textDark} group-hover:${colors.bgHover} dark:group-hover:${colors.bgHoverDark}`;
}

/**
 * Get folder text color class (simple text color)
 */
export function getFolderTextColorClass(hexColor: string | null | undefined): string {
  const colors = FOLDER_COLOR_CLASSES[hexColor || '#6366f1'] || FOLDER_COLOR_CLASSES['#6366f1'];
  return colors.text;
}

// Folder border colors (hex -> border classes with opacity)
export const FOLDER_BORDER_COLORS: Record<string, { default: string; opacity50: string }> = {
  '#ef4444': { default: 'border-red-500', opacity50: 'border-red-500/50' },
  '#f97316': { default: 'border-orange-500', opacity50: 'border-orange-500/50' },
  '#eab308': { default: 'border-yellow-500', opacity50: 'border-yellow-500/50' },
  '#22c55e': { default: 'border-green-500', opacity50: 'border-green-500/50' },
  '#10b981': { default: 'border-emerald-500', opacity50: 'border-emerald-500/50' },
  '#14b8a6': { default: 'border-teal-500', opacity50: 'border-teal-500/50' },
  '#06b6d4': { default: 'border-cyan-500', opacity50: 'border-cyan-500/50' },
  '#0ea5e9': { default: 'border-sky-500', opacity50: 'border-sky-500/50' },
  '#3b82f6': { default: 'border-blue-500', opacity50: 'border-blue-500/50' },
  '#6366f1': { default: 'border-indigo-500', opacity50: 'border-indigo-500/50' },
  '#8b5cf6': { default: 'border-violet-500', opacity50: 'border-violet-500/50' },
  '#a855f7': { default: 'border-purple-500', opacity50: 'border-purple-500/50' },
  '#d946ef': { default: 'border-fuchsia-500', opacity50: 'border-fuchsia-500/50' },
  '#ec4899': { default: 'border-pink-500', opacity50: 'border-pink-500/50' },
  '#f43f5e': { default: 'border-rose-500', opacity50: 'border-rose-500/50' },
};

/**
 * Get folder border color class
 */
export function getFolderBorderColorClass(hexColor: string | null | undefined, opacity?: string): string {
  const borders = FOLDER_BORDER_COLORS[hexColor || '#6366f1'] || FOLDER_BORDER_COLORS['#6366f1'];
  return opacity === '50' ? borders.opacity50 : borders.default;
}

// Folder text colors with dark mode variants (hex -> text classes)
export const FOLDER_TEXT_COLOR_CLASSES: Record<string, {
  base: string;
  dark: string;
  hover: string;
  hoverDark: string;
}> = {
  '#ef4444': { base: 'text-red-600', dark: 'dark:text-red-400', hover: 'group-hover:text-red-500', hoverDark: 'dark:group-hover:text-red-300' },
  '#f97316': { base: 'text-orange-600', dark: 'dark:text-orange-400', hover: 'group-hover:text-orange-500', hoverDark: 'dark:group-hover:text-orange-300' },
  '#eab308': { base: 'text-yellow-600', dark: 'dark:text-yellow-400', hover: 'group-hover:text-yellow-500', hoverDark: 'dark:group-hover:text-yellow-300' },
  '#22c55e': { base: 'text-green-600', dark: 'dark:text-green-400', hover: 'group-hover:text-green-500', hoverDark: 'dark:group-hover:text-green-300' },
  '#10b981': { base: 'text-emerald-600', dark: 'dark:text-emerald-400', hover: 'group-hover:text-emerald-500', hoverDark: 'dark:group-hover:text-emerald-300' },
  '#14b8a6': { base: 'text-teal-600', dark: 'dark:text-teal-400', hover: 'group-hover:text-teal-500', hoverDark: 'dark:group-hover:text-teal-300' },
  '#06b6d4': { base: 'text-cyan-600', dark: 'dark:text-cyan-400', hover: 'group-hover:text-cyan-500', hoverDark: 'dark:group-hover:text-cyan-300' },
  '#0ea5e9': { base: 'text-sky-600', dark: 'dark:text-sky-400', hover: 'group-hover:text-sky-500', hoverDark: 'dark:group-hover:text-sky-300' },
  '#3b82f6': { base: 'text-blue-600', dark: 'dark:text-blue-400', hover: 'group-hover:text-blue-500', hoverDark: 'dark:group-hover:text-blue-300' },
  '#6366f1': { base: 'text-indigo-600', dark: 'dark:text-indigo-400', hover: 'group-hover:text-indigo-500', hoverDark: 'dark:group-hover:text-indigo-300' },
  '#8b5cf6': { base: 'text-violet-600', dark: 'dark:text-violet-400', hover: 'group-hover:text-violet-500', hoverDark: 'dark:group-hover:text-violet-300' },
  '#a855f7': { base: 'text-purple-600', dark: 'dark:text-purple-400', hover: 'group-hover:text-purple-500', hoverDark: 'dark:group-hover:text-purple-300' },
  '#d946ef': { base: 'text-fuchsia-600', dark: 'dark:text-fuchsia-400', hover: 'group-hover:text-fuchsia-500', hoverDark: 'dark:group-hover:text-fuchsia-300' },
  '#ec4899': { base: 'text-pink-600', dark: 'dark:text-pink-400', hover: 'group-hover:text-pink-500', hoverDark: 'dark:group-hover:text-pink-300' },
  '#f43f5e': { base: 'text-rose-600', dark: 'dark:text-rose-400', hover: 'group-hover:text-rose-500', hoverDark: 'dark:group-hover:text-rose-300' },
};

/**
 * Get folder text color classes with dark mode variants
 */
export function getFolderTextColorClasses(hexColor: string | null | undefined): {
  base: string;
  dark: string;
  hover: string;
  hoverDark: string;
} {
  return FOLDER_TEXT_COLOR_CLASSES[hexColor || '#6366f1'] || FOLDER_TEXT_COLOR_CLASSES['#6366f1'];
}

