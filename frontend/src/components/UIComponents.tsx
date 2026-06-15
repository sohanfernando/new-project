import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Upload, Users, Award, ShieldAlert, AlertTriangle, Sun, Moon, ChevronDown, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

// ConfirmModal Component
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-xs">
      <div className="bg-bg-card rounded-modal shadow-modal border border-border-main w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-error">
            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center border border-red-100 dark:border-red-900/30 shrink-0">
              <AlertTriangle size={20} className="text-error" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">{title}</h3>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{message}</p>
        </div>
        <div className="bg-bg-page/50 dark:bg-input-bg/50 px-6 py-4 flex items-center justify-end gap-3 border-t border-border-main">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-text-secondary bg-bg-card border border-input-border rounded-btn hover:bg-bg-page active:bg-bg-page/80 cursor-pointer transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-error rounded-btn hover:bg-red-600 active:bg-red-700 cursor-pointer transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};


// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyle = "px-4 py-2 text-sm font-semibold rounded-btn transition-colors focus:outline-none cursor-pointer duration-200 flex items-center justify-center";
  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800",
    secondary: "bg-bg-card border border-input-border text-text-primary hover:bg-bg-page active:bg-bg-page/80",
    danger: "bg-error text-white hover:bg-red-600 active:bg-red-700",
  };
  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// InputField Component
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, className = '', rightElement, ...props }, ref) => {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-secondary mb-1 leading-5">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            className={`w-full px-3 py-2 text-sm bg-input-bg border ${error ? 'border-error focus:border-error focus:ring-red-100' : 'border-input-border focus:border-primary-500 focus:ring-blue-100'
              } rounded-input focus:outline-none focus:ring-2 transition-all text-text-primary ${rightElement ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-error font-medium">{error}</p>}
      </div>
    );
  }
);

InputField.displayName = 'InputField';

// SelectField Component
interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string | number; label: string }[];
  error?: string;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, options, error, className = '', onChange, onClick, onBlur, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const justChangedRef = React.useRef(false);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      justChangedRef.current = true;
      setIsOpen(false);
      if (onChange) {
        onChange(e);
      }
      e.target.blur();
      setTimeout(() => {
        justChangedRef.current = false;
      }, 100);
    };

    const handleClick = (e: React.MouseEvent<HTMLSelectElement>) => {
      if (justChangedRef.current) {
        return;
      }
      setIsOpen(!isOpen);
      if (onClick) {
        onClick(e);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
      setIsOpen(false);
      if (onBlur) {
        onBlur(e);
      }
    };

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-secondary mb-1 leading-5">
          {label}
        </label>
        <div className="relative">
          <select
            ref={ref}
            onChange={handleChange}
            onClick={handleClick}
            onBlur={handleBlur}
            className={`w-full pl-3 pr-10 py-2 text-sm bg-input-bg border ${error ? 'border-error focus:border-error focus:ring-red-100' : 'border-input-border focus:border-primary-500 focus:ring-blue-100'
              } rounded-dropdown focus:outline-none focus:ring-2 transition-all text-text-primary appearance-none ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-bg-card text-text-primary">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-secondary/60">
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
            />
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-error font-medium">{error}</p>}
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';

// Card Component
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`bg-bg-card rounded-card shadow-card border border-border-main text-text-primary p-6 transition-all duration-200 ${className}`}>
      {children}
    </div>
  );
};

// Sidebar Layout Component
export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  // Initialize theme from localStorage
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      return 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      return 'light';
    }
  });

  const toggleTheme = () => {
    if (theme === 'light') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    }
  };

  if (!user) return <>{children}</>;

  const menuItems = [
    { path: '/extract', label: 'Extract CV', icon: <Upload size={18} /> },
    { path: '/candidates', label: 'Candidates List', icon: <Users size={18} /> },
    { path: '/roles', label: 'Manage Roles', icon: <Award size={18} /> },
    { path: '/levels', label: 'Manage Levels', icon: <ShieldAlert size={18} /> },
  ];

  return (
    <div className="flex min-h-screen bg-bg-page transition-colors duration-200">
      {/* Mobile Top Header */}
      <header className="flex md:hidden items-center justify-between h-16 px-6 bg-bg-sidebar border-b border-border-main fixed top-0 left-0 right-0 z-30 transition-colors duration-200">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold text-primary-600 dark:text-primary-500 tracking-tight">Sysco HR</span>
          <span className="text-[10px] bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 text-primary-700 dark:text-primary-700 font-bold px-2 py-0.5 rounded-full">
            Portal
          </span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-text-secondary hover:text-text-primary rounded focus:outline-none cursor-pointer"
        >
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Backdrop for mobile view */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in backdrop-blur-xs"
        />
      )}

      {/* Sidebar Panel */}
      <aside className={`fixed top-0 left-0 h-screen z-50 w-64 bg-bg-sidebar border-r border-border-main flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:sticky md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-colors duration-200`}>
        <div>
          {/* Brand Header */}
          <div className="h-16 px-6 border-b border-border-main flex items-center justify-between">
            <span className="text-xl font-extrabold text-primary-600 dark:text-primary-500 tracking-tight">Sysco HR</span>
            <span className="text-[10px] bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 text-primary-700 dark:text-primary-700 font-bold px-2 py-0.5 rounded-full">
              Portal
            </span>
          </div>

          {/* HR Metadata Card */}
          <div className="p-4 border-b border-border-main bg-bg-page/40 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-950/30 text-primary-700 dark:text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
              {(() => {
                const name = user.full_name;
                if (name) {
                  const parts = name.trim().split(/\s+/);
                  if (parts.length >= 2) {
                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                  }
                  return parts[0].slice(0, 2).toUpperCase();
                }
                return user.email.slice(0, 2).toUpperCase();
              })()}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-text-primary truncate" title={user.full_name || user.email}>
                {user.full_name || user.email}
              </p>
              <p className="text-[10px] text-text-secondary font-medium">Administrator</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path === '/extract' && location.pathname === '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-btn transition-all duration-200 ${isActive
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-text-secondary hover:bg-bg-page hover:text-text-primary'
                    }`}
                >
                  <span className={isActive ? 'text-white' : 'text-text-secondary opacity-70'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border-main bg-bg-sidebar flex flex-col gap-2 transition-colors duration-200">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-text-secondary rounded-btn hover:bg-bg-page hover:text-text-primary transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
            </div>
            <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ${theme === 'dark' ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-text-secondary rounded-btn hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-all duration-200 cursor-pointer"
          >
            <LogOut size={18} className="text-text-secondary opacity-70" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Page Content viewport */}
      <div className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0">
        <main className="flex-1 py-8 px-6 md:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
