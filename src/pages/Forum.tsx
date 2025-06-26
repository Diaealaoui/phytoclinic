import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Forum from '../components/Forum';

const ForumPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-6">
      <div className="w-full flex justify-start mb-6">
        <Button onClick={() => navigate('/dashboard')} variant="outline" className="bg-white/80">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
      <Forum />
    </div>
  );
};

export default ForumPage;