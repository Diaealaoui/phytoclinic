import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Not strictly needed in this file anymore but kept for safety if any UI components were missed
import {
  ArrowLeft,
  Brain,
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Zap,
  Settings,
  RefreshCw,
  Eye,
  Target,
  Activity
} from 'lucide-react';
import AnalyticsDashboard from '@/components/AnalyticsDashboard'; // Your main dashboard component
import { supabase } from '@/lib/supabase'; // Kept as it might be used by children, though not directly in this simplified wrapper

const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    // The main container with background gradient
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Header for AnalyticsPage - includes back button */}
      <header className="p-4 md:p-6 flex items-center justify-between border-b border-gray-200 bg-white shadow-sm">
        <Button
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI Analytics Center
        </h1>
      </header>

      <div className="flex-1 container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* The main Analytics Dashboard content - now always displayed */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl p-4 md:p-6">
          <AnalyticsDashboard />
        </div>

        {/* Footer - remains as is */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Powered by AI • Real-time Analytics • Predictive Intelligence
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
