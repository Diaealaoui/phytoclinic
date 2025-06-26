import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export interface Section {
  id: string;
  title: string;
  icon: any;
  desc: string;
}

export interface DashboardProps {
  userType: 'admin' | 'client';
  userEmail: string;
  onLogout: () => void;
  onNavigate: (section: string) => void;
  sections?: Section[];
  title?: string;
}

const BaseDashboard: React.FC<DashboardProps> = ({ userEmail, onLogout, onNavigate, sections = [], title }) => {
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
              <h1 className="text-4xl font-bold text-green-700">{title}</h1>
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
          {sections.map(({ id, icon: Icon, title, desc }) => (
            <Card
              key={id}
              onClick={() => onNavigate(id)}
              className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm hover:scale-105"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-3 rounded-full bg-gradient-to-r from-green-500 to-teal-500 text-white">
                    <Icon className="w-6 h-6" />
                  </div>
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BaseDashboard;
