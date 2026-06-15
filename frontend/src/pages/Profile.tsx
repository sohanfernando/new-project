import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Button } from '../components/UIComponents';
import { User as UserIcon, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Profile: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">User Profile</h1>
        <p className="text-text-secondary text-sm">Manage your account details and view your parsed resume info</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <Card className="md:col-span-1 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mb-4 border border-primary-100 dark:border-primary-900/30">
            <UserIcon size={44} />
          </div>
          <h3 className="font-bold text-text-primary text-lg">{user.full_name || user.email.split('@')[0]}</h3>
          <span className="bg-primary-50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-400 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-primary-100 dark:border-primary-900/30 mt-2">
            {user.role}
          </span>
          {user.title_role && (
            <span className="text-xs text-text-secondary mt-2 font-medium">
              {user.title_role} ({user.level})
            </span>
          )}
          
          <div className="w-full border-t border-border-main mt-6 pt-4 text-left">
            <p className="text-xs text-text-secondary flex items-center gap-1.5 justify-center">
              <Mail size={14} className="text-text-secondary/60" /> {user.email}
            </p>
          </div>
          
          <Link to="/" className="w-full mt-6">
            <Button variant="secondary" fullWidth>Back to Dashboard</Button>
          </Link>
        </Card>

        {/* Account Details */}
        <Card className="md:col-span-2">
          <h3 className="text-lg font-bold text-text-primary mb-4 border-b border-border-main pb-2">Account Status</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border-main/50">
              <span className="text-sm text-text-secondary font-medium">Account Type</span>
              <span className="text-sm font-semibold text-text-primary">{user.role}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-main/50">
              <span className="text-sm text-text-secondary font-medium">System Seniority Level</span>
              <span className="text-sm font-semibold text-text-primary">{user.level || 'Not Set'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border-main/50">
              <span className="text-sm text-text-secondary font-medium">System Professional Title</span>
              <span className="text-sm font-semibold text-text-primary">{user.title_role || 'Not Set'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-text-secondary font-medium">Account Status</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-success rounded-full border border-emerald-100 dark:border-emerald-900/30">
                Active
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
