// AdminDashboard.tsx (No changes needed, already configured for 'users' ID)

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  MessageSquare, 
  LogOut, 
  AreaChart,
  Menu,
  Settings,
  RefreshCw,
  Upload,
  Link as LinkIcon,
  Users, // Used for User Management icon
  History,
  X,
  Database,
  ChevronRight,
  FileText,
  BookOpen
} from 'lucide-react';

interface Props {
  userEmail: string;
  onLogout: () => void;
  onNavigate: (section: string) => void;
}

const AdminDashboard: React.FC<Props> = ({ userEmail, onLogout, onNavigate }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSettingsSubmenu, setShowSettingsSubmenu] = useState(false);

  // Main business sections (primary dashboard items)
  const mainSections = [
    { 
      id: 'analytics', 
      title: 'Sales Analytics', 
      icon: AreaChart, 
      desc: 'View comprehensive sales reports and charts',
      color: 'from-blue-500 to-blue-600',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    { 
      id: 'mindmap', 
      title: 'Invoice Mind Map', 
      icon: BarChart3, 
      desc: 'Interactive visualization of invoice relationships',
      color: 'from-green-500 to-green-600',
      lightColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    { 
      id: 'forum', 
      title: 'Q&A Forum', 
      icon: MessageSquare, 
      desc: 'Customer support and community discussions',
      color: 'from-purple-500 to-purple-600',
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    // ✅ NEW: Product Catalogues section
    { 
      id: 'catalogues', 
      title: 'Product Catalogues', 
      icon: BookOpen, 
      desc: 'View and manage product catalogues',
      color: 'from-orange-500 to-orange-600',
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    }
  ];

  // Settings submenu items (technical/admin functions)
  const settingsItems = [
    { id: 'sync-manager', title: 'Sync Manager', icon: RefreshCw, desc: 'Manage data synchronization' },
    { id: 'zoho', title: 'Zoho Integration', icon: LinkIcon, desc: 'Configure Zoho Books connection' },
    { id: 'csv-upload', title: 'CSV Import', icon: Upload, desc: 'Import data from CSV files' },
    // ✅ NEW: Catalogue management in settings
    { id: 'catalogue-upload', title: 'Manage Catalogues', icon: FileText, desc: 'Upload and manage product catalogues' },
    { id: 'users', title: 'User Management', icon: Users, desc: 'Manage user accounts and permissions' } //
  ];

  const handleNavigation = (sectionId: string) => {
    onNavigate(sectionId);
    setIsMobileMenuOpen(false);
    setShowSettingsSubmenu(false);
  };

  const handleSettingsClick = () => {
    setShowSettingsSubmenu(!showSettingsSubmenu);
  };

  // Mobile Menu Overlay
  const MobileMenuOverlay = () => (
    <div 
      className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
        isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={() => setIsMobileMenuOpen(false)}
      />
      
      {/* Menu Content */}
      <div 
        className={`absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Menu Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-500 to-teal-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img 
                  src="https://d64gsuwffb70l.cloudfront.net/6848c10115c1e7aea64f3606_1749599147143_6f59f594.jpg" 
                  alt="Logo" 
                  className="h-10 w-auto"
                />
                <span className="font-bold text-white text-lg">Admin Menu</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Menu Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Main Sections */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 px-2">Main Features</h3>
              <div className="space-y-2">
                {mainSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleNavigation(section.id)}
                      className="w-full flex items-center space-x-3 p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 text-left border border-gray-100 hover:border-gray-200"
                    >
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${section.color} text-white shadow-sm`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{section.title}</div>
                        <div className="text-xs text-gray-500 truncate">{section.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Settings */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 px-2">System Settings</h3>
              <div className="space-y-2">
                {settingsItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 text-left"
                    >
                      <div className="p-2 rounded-lg bg-gray-200 text-gray-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm">{item.title}</div>
                        <div className="text-xs text-gray-500 truncate">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Menu Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <Button 
              onClick={onLogout} 
              variant="outline" 
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-teal-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-lg border-b-2 border-green-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <img 
              src="https://d64gsuwffb70l.cloudfront.net/6848c10115c1e7aea64f3606_1749599147143_6f59f594.jpg" 
              alt="Phytoclinic Logo" 
              className="h-16 w-auto object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-green-700">Admin Portal</h1>
              <p className="text-base text-gray-600 truncate max-w-[180px]">{userEmail}</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-3"
          >
            <Menu className="h-8 w-8 text-green-700" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <MobileMenuOverlay />

      {/* Main Content */}
      <div className="container mx-auto p-6 lg:p-8">
        {/* Desktop Header */}
        <div className="hidden lg:block mb-16">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-200 p-12">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-8">
                <img 
                  src="https://d64gsuwffb70l.cloudfront.net/6848c10115c1e7aea64f3606_1749599147143_6f59f594.jpg" 
                  alt="Phytoclinic Logo" 
                  className="h-32 w-auto object-contain"
                />
                <div>
                  <h1 className="text-6xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-3">
                    Admin Dashboard
                  </h1>
                  <p className="text-2xl text-gray-600 mb-2">Phytoclinic Management Portal</p>
                  <p className="text-xl text-gray-500">Welcome back, <span className="font-semibold text-green-700">{userEmail}</span></p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-4">
                <Button 
                  onClick={onLogout} 
                  variant="outline" 
                  size="lg"
                  className="text-red-600 border-red-200 hover:bg-red-50 px-8 py-4 text-lg"
                >
                  <LogOut className="w-6 h-6 mr-3" />
                  Logout
                </Button>
                <p className="text-base text-gray-500">Administrator Access</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Welcome Message */}
        <div className="lg:hidden mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-2xl font-bold text-green-700 mb-2">Welcome back!</h2>
            <p className="text-gray-600">Choose from the main features below or access system settings</p>
          </div>
        </div>

        {/* Main Sections Grid - Updated with 4 cards */}
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6 lg:mb-8">Main Features</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
              {mainSections.map((section) => {
                const Icon = section.icon;
                return (
                  <Card 
                    key={section.id} 
                    onClick={() => handleNavigation(section.id)}
                    className="cursor-pointer hover:scale-105 transition-all duration-300 border-0 bg-white shadow-xl hover:shadow-2xl group overflow-hidden"
                  >
                    <CardHeader className="pb-4 relative">
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${section.color}`}></div>
                      <CardTitle className="flex flex-col items-center text-center space-y-4 pt-6 pb-2">
                        <div className={`p-6 rounded-2xl bg-gradient-to-r ${section.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-8 h-8 lg:w-10 lg:h-10" />
                        </div>
                        <span className="text-xl lg:text-2xl font-bold text-gray-800">{section.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center pb-8">
                      <p className="text-gray-600 text-base lg:text-lg leading-relaxed">{section.desc}</p>
                      <div className={`mt-4 inline-block px-4 py-2 rounded-full ${section.lightColor} ${section.textColor} text-sm font-medium`}>
                        Click to Access
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Settings Section - Desktop */}
          <div className="hidden lg:block">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">System Settings</h2>
            <Card 
              className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-white border-2 border-gray-200"
              onClick={handleSettingsClick}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-2xl">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                      <Settings className="w-7 h-7" />
                    </div>
                    <span>System Configuration</span>
                  </div>
                  <ChevronRight className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${showSettingsSubmenu ? 'rotate-90' : ''}`} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-lg mb-4">
                  Access technical settings, integrations, and system tools
                </p>
                
                {/* Settings Submenu */}
                <div className={`transition-all duration-300 overflow-hidden ${showSettingsSubmenu ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    {settingsItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigation(item.id);
                          }}
                          className="flex items-start space-x-3 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 text-left group"
                        >
                          <div className="p-2 rounded-lg bg-white shadow-sm group-hover:shadow-md transition-shadow">
                            <Icon className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm group-hover:text-green-700 transition-colors">
                              {item.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                              {item.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Settings Access */}
          <div className="lg:hidden">
            <h3 className="text-xl font-bold text-gray-700 mb-4">Need System Settings?</h3>
            <Card className="bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300">
              <CardContent className="p-6 text-center">
                <Settings className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-700 mb-4">Access technical settings and integrations</p>
                <Button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  variant="outline"
                  className="bg-white"
                >
                  <Menu className="w-4 h-4 mr-2" />
                  Open Settings Menu
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="inline-block bg-white rounded-full px-8 py-4 shadow-lg border border-gray-200">
            <p className="text-gray-600 font-medium">
              🌱 Phytoclinic Management Portal • Empowering Agricultural Excellence
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;