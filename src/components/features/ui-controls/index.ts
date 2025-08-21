// Main orchestrator component
export { default as GlobalControls } from './GlobalControls';

// Individual components for direct use
export { default as LanguageThemeControls } from './LanguageThemeControls';
export { default as FloatingControls } from './FloatingControls';
export { default as CompactLanguageSwitcher } from './CompactLanguageSwitcher';
export { CompactThemeToggle } from './CompactThemeToggle';

// Re-export from GlobalControls for convenience
export {
  LanguageThemeControls as LanguageThemeControlsFromGlobal,
  FloatingControls as FloatingControlsFromGlobal,
  CompactLanguageSwitcher as CompactLanguageSwitcherFromGlobal,
  CompactThemeToggle as CompactThemeToggleFromGlobal
} from './GlobalControls';