import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, MessageSquare, Upload, Link as LinkIcon, LogOut, AreaChart } from 'lucide-react'; // Add AreaChart icon

import {
  BarChart3,
  Users,
  MessageSquare,
  LogOut,
  Upload,
  Link as LinkIcon
} from 'lucide-react';

interface DashboardProps {
  userType: 'admin' | 'client';
  userEmail: string;
  onLogout: () => void;
  onNavigate: (section: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userType, userEmail, onLogout, onNavigate }) => {
  const adminSections = [
    { 
      id: 'analytics', 
      title: 'Sales Analytics', 
      icon: AreaChart, 
      desc:'View charts and sales metrics' 
    },
    { 
      id: 'mindmap', 
      title: 'Invoice Mind Map', 
      icon: BarChart3, 
      desc: 'Visualize invoices hierarchically' 
    },
    {
      id: 'mindmap',
      title: 'Invoice Mind Map',
      icon: BarChart3,
      desc: 'Visualize all invoice data hierarchically'
    },
    {
      id: 'forum',
      title: 'Q&A Forum',
      icon: MessageSquare,
      desc: 'Engage with community discussions'
    },
    {
      id: 'csv-upload',
      title: 'CSV Import',
      icon: Upload,
      desc: 'Upload and parse invoice data from CSV'
    },
    {
      id: 'zoho',
      title: 'Zoho Integration',
      icon: LinkIcon,
      desc: 'Link Zoho Books and sync invoices'
    }
  ];

  const clientSections = [
    {
      id: 'history',
      title: 'Purchase History',
      icon: Users,
      desc: 'View your past invoice records'
    },
    {
      id: 'forum',
      title: 'Q&A Forum',
      icon: MessageSquare,
      desc: 'Ask or answer product-related questions'
    }
  ];

  const sections = userType === 'admin' ? adminSections : clientSections;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50">
      <div className="container mx-auto p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <img 
              src="https://d64gsuwffb70l.cloudfront.net/6848c10115c1e7aea64f3606_1749599147143_6f59f594.jpg" 
              alt="Phytoclinic Logo" 
              className="h-16 w-auto object-contain"
            />
            <div>
              <h1 className="text-4xl font-bold text-green-700">
                {userType === 'admin' ? 'Admin Dashboard' : 'Client Portal'}
              </h1>
              <p className="text-green-600 mt-1">Phytoclinic Portal</p>
              <p className="text-gray-600 text-sm">Welcome back, {userEmail}</p>
            </div>
          </div>
          <Button
            onClick={onLogout}
            variant="outline"
            className="flex items-center gap-2 border-green-200 text-green-700 hover:bg-green-50"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.id}
                className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm hover:scale-105"
                onClick={() => onNavigate(section.id)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-3 rounded-full bg-gradient-to-r from-green-500 to-teal-500 text-white">
                      <Icon className="w-6 h-6" />
                    </div>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{section.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
