// DEPRECATED: Legacy UI Controls
// These components have been replaced by the new AccessibilityFloatingMenu
// located at @/components/features/accessibility
// New implementation provides better accessibility and user experience

// Main orchestrator component
/** @deprecated Use AccessibilityFloatingMenu from @/components/features/accessibility instead */
export { default as GlobalControls } from './GlobalControls';

// Individual components for direct use
/** @deprecated Use AccessibilityFloatingMenu from @/components/features/accessibility instead */
export { default as LanguageThemeControls } from './LanguageThemeControls';
/** @deprecated Use AccessibilityFloatingMenu from @/components/features/accessibility instead */
export { default as FloatingControls } from './FloatingControls';
/** @deprecated No longer needed with AccessibilityFloatingMenu */
export { default as CompactLanguageSwitcher } from './CompactLanguageSwitcher';
/** @deprecated No longer needed with AccessibilityFloatingMenu */
export { CompactThemeToggle } from './CompactThemeToggle';

// Re-export from GlobalControls for convenience
/** @deprecated Use AccessibilityFloatingMenu from @/components/features/accessibility instead */
export {
  LanguageThemeControls as LanguageThemeControlsFromGlobal,
  FloatingControls as FloatingControlsFromGlobal,
  CompactLanguageSwitcher as CompactLanguageSwitcherFromGlobal,
  CompactThemeToggle as CompactThemeToggleFromGlobal
} from './GlobalControls';