// UI component prop types and interfaces
import type { ReactNode, ErrorInfo } from 'react';

// Common UI component props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

// Button variants and sizes
export type ButtonVariant = 
  | 'default' 
  | 'destructive' 
  | 'outline' 
  | 'secondary' 
  | 'ghost' 
  | 'link';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

// Card component props
export interface CardProps extends BaseComponentProps {
  variant?: 'default' | 'outline';
}

// Form field props
export interface FormFieldProps extends BaseComponentProps {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
}

// Error boundary props
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

// Modal/Dialog props
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

// Table props
export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: T[keyof T], record: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string | number;
}

export interface TableProps<T = Record<string, unknown>> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

// Form component props
export interface FormProps extends BaseComponentProps {
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

// Navigation props
export interface NavigationItem {
  label: string;
  href: string;
  icon?: ReactNode;
  active?: boolean;
  disabled?: boolean;
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

// Component state types
export interface ComponentState {
  loading: boolean;
  error: string | null;
  data: unknown;
}