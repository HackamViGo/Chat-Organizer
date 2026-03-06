import { useState } from 'react'

import { getPlatformTheme } from '../store/appStore'

export function useModelHighlight(platform?: string | null) {
  const [isHovered, setIsHovered] = useState(false)
  const theme = getPlatformTheme(platform)

  // Dynamic style for card highlighing based on platform
  const highlightStyle = isHovered
    ? {
        boxShadow: `0 0 40px -10px ${theme.colors.primary}40`,
        borderColor: theme.colors.primary,
        transform: 'translateY(-2px) scale(1.01)',
      }
    : {}

  return {
    isHovered,
    setIsHovered,
    theme,
    highlightStyle,
  }
}
