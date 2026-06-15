import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { InputField, Button, Card } from '../components/UIComponents';
import { Lock, Eye, EyeOff, Sun, Moon } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setLoading(true);
    setApiError(null);
    try {
      await login(data);
      navigate('/');
    } catch (err: any) {
      setApiError(err.message || 'Incorrect email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page px-4 py-12 relative transition-colors duration-200">
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-bg-card border border-border-main text-text-secondary hover:text-text-primary hover:bg-bg-page/50 transition-all shadow-sm cursor-pointer"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 text-primary-600 mb-4 border border-primary-500/20">
            <Lock size={28} />
          </div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Sysco HR Portal</h1>
          <p className="text-text-secondary mt-2 text-sm">Talent Acquisition & CV Reading Platform</p>
        </div>

        <Card className="border border-border-main shadow-card">
          <h2 className="text-xl font-bold text-text-primary mb-6 text-center">HR Administrator Sign In</h2>

          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-error text-xs font-semibold rounded-btn">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <InputField
              label="HR Email Address"
              type="email"
              placeholder="sapuni.m@sysco-hr.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <InputField
              label="Access Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer flex items-center justify-center p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            <Button type="submit" fullWidth className="mt-6 py-2.5" disabled={loading}>
              {loading ? 'Verifying Session...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border-main text-center text-xs text-text-secondary">
            Authorized Personnel Only
          </div>
        </Card>
      </div>
    </div>
  );
};
