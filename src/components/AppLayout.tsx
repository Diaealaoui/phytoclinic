import React, { useState } from 'react';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';
import Dashboard from './Dashboard';
import Forum from './Forum';
import MindMap from './MindMap';
import PurchaseHistory from './PurchaseHistory';
import CsvUploader from './CsvUploader';

type UserType = 'admin' | 'client' | null;
type CurrentSection = 'dashboard' | 'mindmap' | 'history' | 'forum' | 'csv-upload';
type AuthMode = 'login' | 'signup';

const AppLayout: React.FC = () => {
  const [user, setUser] = useState<{ type: UserType; email: string } | null>(null);
  const [currentSection, setCurrentSection] = useState<CurrentSection>('dashboard');
  const [authMode, setAuthMode] = useState<AuthMode>('signup');

  const handleLogin = (userType: 'admin' | 'client', email: string) => {
    setUser({ type: userType, email });
    setCurrentSection('dashboard');
  };

  const handleSignUp = (userType: 'admin' | 'client', email: string) => {
    setUser({ type: userType, email });
    setCurrentSection('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentSection('dashboard');
    setAuthMode('login');
  };

  const handleNavigate = (section: string) => {
    setCurrentSection(section as CurrentSection);
  };

  const handleBack = () => {
    setCurrentSection('dashboard');
  };

  const switchToLogin = () => {
    setAuthMode('login');
  };

  const switchToSignUp = () => {
    setAuthMode('signup');
  };

  if (!user) {
    if (authMode === 'signup') {
      return <SignUpForm onSignUp={handleSignUp} onSwitchToLogin={switchToLogin} />;
    } else {
      return <LoginForm onLogin={handleLogin} onSwitchToSignUp={switchToSignUp} />;
    }
  }

  switch (currentSection) {
    case 'mindmap':
      return <MindMap />;
    case 'history':
      return <PurchaseHistory userEmail={user.email} />;
    case 'forum':
      return <Forum userEmail={user.email} />;
    case 'csv-upload':
      return <CsvUploader onBack={handleBack} />;
    default:
      return (
        <Dashboard
          userType={user.type!}
          userEmail={user.email}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      );
  }
};

export default AppLayout;