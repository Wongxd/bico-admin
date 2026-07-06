import { createContext, useContext, useState } from 'react'
import { getCookie, setCookie } from '@/lib/cookies'

export type Collapsible = 'offcanvas' | 'icon' | 'none'
type Variant = 'inset' | 'sidebar' | 'floating'
export type AuthTemplate = 'default' | 'split'
export type ContentWidth = 'fluid' | 'boxed'

// Cookie constants following the pattern from sidebar.tsx
const LAYOUT_COLLAPSIBLE_COOKIE_NAME = 'layout_collapsible'
const LAYOUT_VARIANT_COOKIE_NAME = 'layout_variant'
const LAYOUT_AUTH_TEMPLATE_COOKIE_NAME = 'layout_auth_template'
const LAYOUT_CONTENT_WIDTH_COOKIE_NAME = 'layout_content_width'
const LAYOUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Default values
const DEFAULT_VARIANT = 'inset'
const DEFAULT_COLLAPSIBLE = 'icon'
const DEFAULT_AUTH_TEMPLATE = 'default'
const DEFAULT_CONTENT_WIDTH = 'fluid'

type LayoutContextType = {
  resetLayout: () => void

  defaultCollapsible: Collapsible
  collapsible: Collapsible
  setCollapsible: (collapsible: Collapsible) => void

  defaultVariant: Variant
  variant: Variant
  setVariant: (variant: Variant) => void

  defaultAuthTemplate: AuthTemplate
  authTemplate: AuthTemplate
  setAuthTemplate: (template: AuthTemplate) => void

  defaultContentWidth: ContentWidth
  contentWidth: ContentWidth
  setContentWidth: (width: ContentWidth) => void
}

const LayoutContext = createContext<LayoutContextType | null>(null)

type LayoutProviderProps = {
  children: React.ReactNode
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [collapsible, _setCollapsible] = useState<Collapsible>(() => {
    const saved = getCookie(LAYOUT_COLLAPSIBLE_COOKIE_NAME)
    return (saved as Collapsible) || DEFAULT_COLLAPSIBLE
  })

  const [variant, _setVariant] = useState<Variant>(() => {
    const saved = getCookie(LAYOUT_VARIANT_COOKIE_NAME)
    return (saved as Variant) || DEFAULT_VARIANT
  })

  const [authTemplate, _setAuthTemplate] = useState<AuthTemplate>(() => {
    const saved = getCookie(LAYOUT_AUTH_TEMPLATE_COOKIE_NAME)
    return (saved as AuthTemplate) || DEFAULT_AUTH_TEMPLATE
  })

  const [contentWidth, _setContentWidth] = useState<ContentWidth>(() => {
    const saved = getCookie(LAYOUT_CONTENT_WIDTH_COOKIE_NAME)
    return (saved as ContentWidth) || DEFAULT_CONTENT_WIDTH
  })

  const setCollapsible = (newCollapsible: Collapsible) => {
    _setCollapsible(newCollapsible)
    setCookie(
      LAYOUT_COLLAPSIBLE_COOKIE_NAME,
      newCollapsible,
      LAYOUT_COOKIE_MAX_AGE
    )
  }

  const setVariant = (newVariant: Variant) => {
    _setVariant(newVariant)
    setCookie(LAYOUT_VARIANT_COOKIE_NAME, newVariant, LAYOUT_COOKIE_MAX_AGE)
  }

  const setAuthTemplate = (newTemplate: AuthTemplate) => {
    _setAuthTemplate(newTemplate)
    setCookie(LAYOUT_AUTH_TEMPLATE_COOKIE_NAME, newTemplate, LAYOUT_COOKIE_MAX_AGE)
  }

  const setContentWidth = (newWidth: ContentWidth) => {
    _setContentWidth(newWidth)
    setCookie(LAYOUT_CONTENT_WIDTH_COOKIE_NAME, newWidth, LAYOUT_COOKIE_MAX_AGE)
  }

  const resetLayout = () => {
    setCollapsible(DEFAULT_COLLAPSIBLE)
    setVariant(DEFAULT_VARIANT)
    setAuthTemplate(DEFAULT_AUTH_TEMPLATE)
    setContentWidth(DEFAULT_CONTENT_WIDTH)
  }

  const contextValue: LayoutContextType = {
    resetLayout,
    defaultCollapsible: DEFAULT_COLLAPSIBLE,
    collapsible,
    setCollapsible,
    defaultVariant: DEFAULT_VARIANT,
    variant,
    setVariant,
    defaultAuthTemplate: DEFAULT_AUTH_TEMPLATE,
    authTemplate,
    setAuthTemplate,
    defaultContentWidth: DEFAULT_CONTENT_WIDTH,
    contentWidth,
    setContentWidth,
  }

  return <LayoutContext value={contextValue}>{children}</LayoutContext>
}

// Define the hook for the provider
// eslint-disable-next-line react-refresh/only-export-components
export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}
