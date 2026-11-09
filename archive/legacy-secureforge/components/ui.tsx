// ─── UI Component Library ──────────────────────────────────────────────
// Essential accessible components with dark navy theme

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cx(...classes: (string | false | undefined | null)[]) {
  return twMerge(clsx(...classes));
}

// ─── Button ────────────────────────────────────────────────────────────
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  className,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-500',
    ghost: 'bg-transparent hover:bg-gray-700 text-gray-200 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button
      className={cx(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};

// ─── Icon ──────────────────────────────────────────────────────────────
export interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, className }) => {
  const icons: Record<string, string> = {
    dashboard: 'M3 12l9-9 9 9M4 10v10h16V10M9 20v-6h6v6',
    ai: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    roadmap: 'M9 19v-6M15 19v-6M3 21V3M21 21V3',
    code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
    crypto: 'M12 2l3.5 4.5L19 9l-4.5 3.5L12 16l-3.5-4.5L5 9l4.5-3.5L12 2z',
    embedded: 'M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z',
    hardware: 'M4 7V4h7M4 7h16v4H4zM7 14H4v10h16V14',
    security: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    projects: 'M2 12c2-4 4-6 8-6s6 2 8 6M4 12h16M4 12v4h16v-4M8 12v4M16 12v4',
    progress: 'M22 12h-4l-3 9L9 3l-3 9H2',
    agents: 'M12 8v4l3 2',
    settings: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
    send: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z',
    gpio: 'M4 7V4h7M4 7h16v4H4zM7 14H4v10h16V14',
    upload2: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
    download2: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M12 12V3M5 12l7-7 7 7',
    refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
    undo: 'M3 7v6h6M21 17a9 9 0 00-15-6.74M21 7a9 9 0 01-15 6.74',
    redo: 'M21 7v6h-6M3 17a9 9 0 0015-6.74M3 7a9 9 0 0115 6.74',
    search: 'M11 11l7-7M4 11h7v7',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z',
    heart: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z',
    filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
    image: 'M3 3h18v18H3zM8.5 8.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    photo: 'M3 3h18v18H3zM8.5 8.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM21 15l-5-5L5 21',
    scene: 'M4 7V4h7M4 7h16v4H4zM7 14H4v10h16V14',
    sparkles: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z',
    play: 'M8 5v14l11-7z',
    check: 'M20 6L9 17l-5-5',
    x: 'M18 6L6 18M6 6l12 12',
    save: 'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8',
    trash: 'M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h12z',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z',
    zoom: 'M11 11l7-7M4 11h7v7M11 8v6',
    compare: 'M4 7V4h7M4 7h16v4H4zM7 14H4v10h16V14',
    copy: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 005.6 1.3A5.5 5.5 0 001.3 4.77c0 1.71 1.12 3.25 2.5 3.74v3.45a2 2 0 002 1.5h6a2 2 0 002-1.5V10.2a8.6 8.6 0 001.5-3.8z',
    edit: 'M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z',
    close: 'M18 6L6 18M6 6l12 12',
    menu: 'M3 6h18M3 12h18M3 18h18',
    'chevron-down': 'M6 9l6 6 6-6',
    'chevron-left': 'M15 6l-6 6 6 6',
    'chevron-right': 'M9 6l6 6-6 6',
    'arrow-up': 'M12 19V5M5 12l7-7 7 7',
    'arrow-down': 'M12 5v14M5 12l7 7 7-7',
    'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
    'arrow-right': 'M5 12h14M12 5l7 7-7 7',
    lightning: 'M13 2L3 14h7l-1 8 10-12h-7l1-8z',
    users: 'M9 7c-2.5 1.5-2.5 4.5 0 6M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M3 10h14',
    flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
    clock: 'M12 7v5l3 2',
    alert: 'M12 8v4M12 16h.01',
    info: 'M12 11v5M12 8h.01',
    sun: 'M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19',
    moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    fullscreen: 'M8 3H5a2 2 0 00-2 2v3M21 3h3a2 2 0 012 2v3M3 8h3a2 2 0 002-2v3M21 16h-3a2 2 0 01-2-2v3M8 21H5a2 2 0 01-2-2v-3',
    logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
    file: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M10 14h4',
    folder: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z',
    link: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
    mail: 'M2 4h20v16H2zM22 7l-10 6L2 7',
    phone: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81',
    camera: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z',
    slider: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M16 21v-3',
    'zoom-in': 'M11 11l7-7M4 11h7v7M11 8v6',
    'zoom-out': 'M11 11l7-7M4 11h7v7M11 8v6',
    rotate: 'M21 12a9 9 0 11-3-6.7M21 3v6h-6',
    reset: 'M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8M3 3v5h5',
    'check-circle': 'M12 8v8M12 12v3',
    'x-circle': 'M15 9l-6 6M9 9l6 6',
    question: 'M12 8v8M12 12h.01',
    github: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 005.6 1.3A5.5 5.5 0 001.3 4.77c0 1.71 1.12 3.25 2.5 3.74v3.45a2 2 0 002 1.5h6a2 2 0 002-1.5V10.2a8.6 8.6 0 001.5-3.8z',
    twitter: 'M22 4.01c-.8.35-1.66.58-2.56.68a4.48 4.48 0 001.97-2.47c-.82.49-1.7.85-2.65 1.06a4.5 4.5 0 00-7.69 4.18A12.68 12.68 0 014.17 3.5a4.5 4.5 0 001.22 5.93A4.49 4.49 0 012 18.24a4.49 4.49 0 003.93 4.45c.47.09.88.18 1.29.24v.06c0 .27.09.52.25.74a4.5 4.5 0 003.92-4.45 12.66 12.66 0 01-6.44-1.84c-.18 0-.36 0-.54 0 2.28 1.44 5.02 2.28 5.02 2.28a12.65 12.65 0 01-3.14.68c-.83 0-1.63-.21-2.32-.58v.06a4.5 4.5 0 001.25 5.34c-.82-.02-1.58-.25-2.28-.62v.06a4.5 4.5 0 003.43 4.42 4.49 4.49 0 01-2.05.07 4.5 4.5 0 004.13 3.15A8.9 8.9 0 011 19.54a12.62 12.62 0 006.86 2c8.49 0 13.2-7 13.2-13.2v.51a4.5 4.5 0 001.25-5.34',
    linkedin: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 2a2 2 0 100 4 2 2 0 000-4z',
  };
  const pathData = icons[name] || icons.search;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={pathData || 'M4 4v5h5M4 12h5v5M4 20h5v-5'} />
    </svg>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────
export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick, hover }) => {
  return (
    <div
      className={cx(
        'bg-white/5 border border-white/10 rounded-xl',
        hover && 'hover:bg-white/10 transition-colors duration-200',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// ─── Badge ────────────────────────────────────────────────────────────
export interface BadgeProps {
  color?: 'blue' | 'violet' | 'green' | 'yellow' | 'red' | 'gray' | 'orange';
  text?: string;
  children?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ color = 'gray', text, children, className }) => {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return (
    <span className={cx('inline-flex items-center px-2 py-0.5 rounded-full text-xs border', colors[color], className)}>
      {text || children}
    </span>
  );
};

// ─── Input ────────────────────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rows?: number;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>}
      <input
        className={cx(
          'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
          'transition-colors duration-150',
          error && 'border-red-500/50 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

// ─── Textarea ─────────────────────────────────────────────────────────
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className, ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>}
      <textarea
        className={cx(
          'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
          'transition-colors duration-150',
          error && 'border-red-500/50 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

// ─── Select ───────────────────────────────────────────────────────────
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, error, options, className, ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>}
      <select
        className={cx(
          'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
          'transition-colors duration-150',
          error && 'border-red-500/50 focus:border-red-500',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-gray-800">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

// ─── Slider ───────────────────────────────────────────────────────────
export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
  showValue?: boolean;
}

export const Slider: React.FC<SliderProps> = ({ label, value, min, max, step = 1, onChange, unit, showValue = true }) => {
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-sm text-gray-300">{label}</label>
        {showValue && (
          <span className="text-sm text-gray-200 font-mono">
            {value}
            {unit && <span className="text-xs text-gray-500 ml-0.5">{unit}</span>}
          </span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
      />
    </div>
  );
};

// ─── Switch ───────────────────────────────────────────────────────────
export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, disabled }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked !== checked) {
      onChange(!checked);
    }
  };
  return (
    <label className={cx('flex items-center gap-3 cursor-pointer select-none', disabled && 'opacity-50')}>
      {label && <span className="text-sm text-gray-300">{label}</span>}
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="sr-only"
        disabled={disabled}
      />
      <span
        className={cx(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
          checked ? 'bg-blue-600' : 'bg-white/20'
        )}
      >
        <span
          className={cx(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </span>
    </label>
  );
};

// ─── Dialog ───────────────────────────────────────────────────────────
export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children, width = 'min(90vw, 480px)' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cx('relative bg-gray-900 border border-white/10 rounded-xl w-full max-h-[90vh] overflow-auto', width)}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <Icon name="x" size={20} />
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

let toastId = 0;

function getToastContainer(): HTMLElement {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  return container as HTMLElement;
}

export function showToast(message: string, type: Toast['type'] = 'info'): void {
  const id = `toast_${toastId++}`;
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.id = id;
  toast.className = `flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
    type === 'success'
      ? 'bg-green-900/90 border border-green-700 text-white'
      : type === 'error'
      ? 'bg-red-900/90 border border-red-700 text-white'
      : type === 'warning'
      ? 'bg-yellow-900/90 border border-yellow-700 text-white'
      : 'bg-blue-900/90 border border-blue-700 text-white'
  }`;
  toast.innerHTML = `
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      ${type === 'success' ? '<path d="M20 6L9 17l-5-5"/>' : type === 'error' ? '<path d="M18 6L6 18M6 6l12 12"/>' : type === 'warning' ? '<path d="M12 9v4M12 17h.01"/>' : '<circle cx="12" cy="12" r="9"/>'}
    </svg>
    <span>${message}</span>
    <button onClick={() => { toast.remove(); }} className="ml-2 text-white/70 hover:text-white transition-colors">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

export const ToastContainer: React.FC = () => {
  const container = document.getElementById('toast-container');
  if (!container) return null;
  return container as unknown as React.ReactNode;
};

// ─── Avatar ───────────────────────────────────────────────────────────
export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  badge?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', badge }) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className={cx(
        'rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center font-semibold text-white',
        sizes[size]
      )}
    >
      {src ? (
        <img src={src} alt={name} className={cx('w-full h-full rounded-full object-cover', sizes[size]) || ''} />
      ) : (
        initials
      )}
      {badge && <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-900" />}
    </div>
  );
};

// ─── Progress Bar ─────────────────────────────────────────────────────
export interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'blue' | 'violet' | 'green' | 'yellow' | 'red' | 'orange';
  showLabel?: boolean;
  showPercent?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = 'blue',
  showLabel = false,
  showPercent = true,
}) => {
  const colors = {
    blue: 'bg-blue-500',
    violet: 'bg-violet-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
  };
  const percent = ((value % max) / max) * 100;
  const displayValue = value % max;
  return (
    <div className="w-full">
      {showLabel && <div className="flex justify-between text-sm text-gray-300 mb-1">
        <span>{showLabel}</span>
        {showPercent && <span className="font-mono text-xs">{Math.round(percent)}%</span>}
      </div>}
      <div className={cx('h-2 bg-white/10 rounded-full overflow-hidden')}>
        <div
          className={cx('h-full rounded-full transition-all duration-300', colors[color])}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      {showPercent && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">{displayValue} / {max}</span>
          <span className="text-xs text-gray-400 font-mono">{Math.round(percent)}%</span>
        </div>
      )}
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────
export interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
        <Icon name={icon} size={32} />
      </div>
      <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
      <p className="text-sm text-gray-400 max-w-sm mt-1">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="primary" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

// ─── Loading Skeleton ─────────────────────────────────────────────────
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return <div className={cx('animate-pulse bg-white/10 rounded', className)} />;
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-white/5 rounded-xl p-4">
      <Skeleton className="w-12 h-12 rounded-lg mb-3" />
      <Skeleton className="w-3/4 h-4 mb-2" />
      <Skeleton className="w-1/2 h-3" />
    </div>
  );
};

// ─── Spinner ──────────────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; label?: string }> = ({ size = 'md', label }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className="flex items-center gap-2">
      <svg className={cx('animate-spin', sizes[size])} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      {label && <span className="text-sm text-gray-300">{label}</span>}
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────
export interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' as const },
  { id: 'ai-tutor', label: 'AI Tutor', icon: 'ai' as const },
  { id: 'roadmap', label: 'Roadmap', icon: 'roadmap' as const },
  { id: 'coding-lab', label: 'Coding Lab', icon: 'code' as const },
  { id: 'crypto-lab', label: 'Crypto Lab', icon: 'crypto' as const },
  { id: 'embedded', label: 'Embedded', icon: 'embedded' as const },
  { id: 'hardware-bench', label: 'Hardware Bench', icon: 'hardware' as const },
  { id: 'security', label: 'Security', icon: 'security' as const },
  { id: 'projects', label: 'Projects', icon: 'projects' as const },
  { id: 'progress', label: 'Progress', icon: 'progress' as const },
  { id: 'agents', label: 'Agents', icon: 'agents' as const },
  { id: 'settings', label: 'Settings', icon: 'settings' as const },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeSection, setActiveSection, sidebarOpen, setSidebarOpen }) => {
  return (
    <aside
      className={cx(
        'fixed top-0 left-0 h-full bg-gray-900 border-r border-white/10 transition-transform duration-200',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'md:translate-x-0 md:static md:left-auto md:w-64 md:h-full'
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Icon name="sparkles" size={24} className="text-blue-400" />
          <span className="text-white font-semibold">PhotoForge</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden text-gray-400 hover:text-white p-1"
        >
          <Icon name="menu" size={24} />
        </button>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveSection(item.id);
              setSidebarOpen(false);
            }}
            className={cx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              activeSection === item.id
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
            )}
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-gray-500">PhotoForge v1.0</div>
      </div>
    </aside>
  );
};

// ─── Divider ──────────────────────────────────────────────────────────
export const Divider: React.FC<{ className?: string }> = ({ className }) => {
  return <div className={cx('border-t border-white/10', className)} />;
};
