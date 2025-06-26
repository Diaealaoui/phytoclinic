import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from '@/components/AdminDashboard';
import ClientDashboard from '@/components/ClientDashboard';

interface DashboardPageProps {
  userType: 'admin' | 'client';
  userEmail: string;
  onLogout: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ userType, userEmail, onLogout }) => {
  const navigate = useNavigate();

  const handleNavigate = (section: string) => {
    console.log('Navigating to section:', section); // Debug log
    
    switch (section) {
      case 'mindmap':
        navigate('/mindmap');
        break;
      case 'forum':
        navigate('/forum');
        break;
      case 'csv-upload': 
        navigate('/csv');
        break;
      case 'zoho':
        navigate('/zoho');
        break;
      case 'history':
        navigate('/history');
        break;
      case 'analytics':
        navigate('/analytics');
        break;
      case 'sync-manager':
        navigate('/sync-manager');
        break;
      // ✅ NEW: Catalogue navigation routes
      case 'catalogue-upload':
        navigate('/catalogue-upload');
        break;
      case 'catalogues':
        // Pass user type as query parameter so the component knows how to render
        navigate(`/catalogues?type=${userType}`);
        break;
      // Admin routes
      case 'users':
        navigate('/users');
        break;
      case 'settings':
        navigate('/settings');
        break;
      default:
        console.warn('Unknown section:', section);
        // Don't navigate for unknown sections
    }
  };

  return userType === 'admin' ? (
    <AdminDashboard
      userEmail={userEmail}
      onLogout={onLogout}
      onNavigate={handleNavigate}
    />
  ) : (
    <ClientDashboard
      userEmail={userEmail}
      onLogout={onLogout}
      onNavigate={handleNavigate}
    />
  );
};

export default DashboardPage;