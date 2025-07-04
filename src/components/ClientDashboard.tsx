// src/components/ClientDashboard.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, LogOut, DollarSign, Package, Calendar, TrendingUp, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  userEmail: string;
  onLogout: () => void;
  onNavigate: (section: string) => void;
}

const ClientDashboard: React.FC<Props> = ({ userEmail, onLogout, onNavigate }) => {
  console.log('ClientDashboard: Component Render Start'); // ADD THIS LOG

  const [dashboardData, setDashboardData] = useState({
    totalSpent: 0,
    totalOrders: 0,
    totalItems: 0,
    recentOrderDate: null as string | null,
    recentForumActivity: null as string | null,
    userName: '',
    cataloguesCount: 0,
    loading: true
  });

  useEffect(() => {
    console.log('ClientDashboard: useEffect triggered'); // ADD THIS LOG
    const fetchDashboardData = async () => {
      console.log('ClientDashboard: fetchDashboardData started'); // Existing log, but now highlighted
      try {
        console.log('🔍 Fetching dashboard data for:', userEmail);
        console.log('START: fetchDashboardData');

        // 1. Get user name
        console.log('STEP 1: Fetching user...');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          setDashboardData(prev => ({ ...prev, loading: false }));
          console.log('STOP: User not found or no email.');
          return;
        }

        console.log('STEP 1: Fetching user profile...');
        const { data: userProfile, error: userProfileError } = await supabase
          .from('users')
          .select('name')
          .eq('email', user.email)
          .single();

        if (userProfileError || !userProfile?.name) {
          console.warn('⚠️ Profile not found or error fetching profile:', userProfileError);
          setDashboardData(prev => ({ ...prev, loading: false, userName: user.email || '' }));
        }

        const userName = userProfile?.name || user.email || '';
        console.log('✅ User name:', userName);

        // 2. Get purchase history from facture table
        console.log('STEP 2: Fetching facture data...');
        const { data: factureData, error: factureError } = await supabase
          .from('facture')
          .select('*')
          .eq('Client Name', userName)
          .order('Date', { ascending: false });

        if (factureError) {
          console.error('❌ Error fetching facture data:', factureError);
        }
        console.log('✅ Facture data fetched. Items:', factureData ? factureData.length : 0);

        // 3. Get forum activity for this user
        console.log('STEP 3: Fetching forum data...');
        const { data: forumPosts } = await supabase
          .from('forum_posts')
          .select('created_at')
          .eq('author_email', user.email)
          .order('created_at', { ascending: false })
          .limit(1);

        const { data: forumReplies } = await supabase
          .from('forum_replies')
          .select('created_at')
          .eq('author_email', user.email)
          .order('created_at', { ascending: false })
          .limit(1);
        console.log('✅ Forum data fetched.');

        // ✅ NEW: Get catalogues count
        console.log('STEP 4: Fetching catalogues count...');
        const { count: cataloguesCount, error: cataloguesError } = await supabase
          .from('product_catalogues')
          .select('*', { count: 'exact', head: true });

        if (cataloguesError) {
          console.error('❌ Error fetching catalogues count:', cataloguesError);
        }
        console.log('✅ Catalogues count fetched:', cataloguesCount);


        console.log('STEP 5: Starting data processing...');
        // Calculate statistics
        let totalSpent = 0;
        let totalItems = 0;
        const invoiceGroups = new Set();
        let recentOrderDate = null;

        if (factureData && factureData.length > 0) {
          factureData.forEach((item: any) => {
            totalSpent += (item.Quantity || 0) * (item.Price || 0);
            const quantity = Number(item.Quantity) || 0;
            totalItems += quantity;
            if (item.invoice_id) {
              invoiceGroups.add(item.invoice_id);
            }
            if (item.Date && (!recentOrderDate || new Date(item.Date) > new Date(recentOrderDate))) {
              recentOrderDate = item.Date;
            }
          });
        }
        console.log('STEP 5: Facture data processed.');


        // Get most recent forum activity
        let recentForumActivity = null;
        const latestPost = forumPosts?.[0]?.created_at;
        const latestReply = forumReplies?.[0]?.created_at;

        if (latestPost && latestReply) {
          recentForumActivity = new Date(latestPost) > new Date(latestReply) ? latestPost : latestReply;
        } else if (latestPost) {
          recentForumActivity = latestPost;
        } else if (latestReply) {
          recentForumActivity = latestReply;
        }
        console.log('STEP 5: Forum data processed.');


        setDashboardData({
          totalSpent,
          totalOrders: invoiceGroups.size,
          totalItems,
          recentOrderDate,
          recentForumActivity,
          userName,
          cataloguesCount: cataloguesCount || 0,
          loading: false
        });

        console.log('✅ Dashboard data calculated and state updated.');
        console.log('END: fetchDashboardData');

      } catch (error) {
        console.error('❌ Error fetching or processing dashboard data:', error);
        setDashboardData(prev => ({ ...prev, loading: false }));
        console.log('END (with error): fetchDashboardData');
      }
    };

    fetchDashboardData();
  }, [userEmail]);

  console.log('ClientDashboard: Component Render End'); // ADD THIS LOG

  const sections = [
    {
      id: 'history',
      title: 'Purchase History',
      icon: Users,
      desc: 'View your invoice records and order details'
    },
    {
      id: 'forum',
      title: 'Q&A Forum',
      icon: MessageSquare,
      desc: 'Ask questions and get support from our community'
    },
    {
      id: 'catalogues',
      title: 'Product Catalogues',
      icon: BookOpen,
      desc: 'Browse our complete product collection and specifications'
    }
  ];

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} MAD`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No recent activity';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50">
      <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <img
              src="https://d64gsuwffb70l.cloudfront.net/6848c10115c1e7aea64f3606_1749599147143_6f59f594.jpg"
              alt="Phytoclinic Logo"
              className="h-12 sm:h-16 w-auto object-contain flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-4xl font-bold text-green-700 truncate">Client Portal</h1>
              <p className="text-green-600 text-sm sm:text-base">Phytoclinic Santé Végétale</p>
              <p className="text-gray-600 text-xs sm:text-sm truncate">
                Welcome, {dashboardData.userName || userEmail}
              </p>
            </div>
          </div>
          <Button
            onClick={onLogout}
            variant="outline"
            className="text-green-700 border-green-200 w-full sm:w-auto"
            size="sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
          <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="text-center sm:flex sm:items-center sm:text-left">
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mx-auto sm:mx-0 mb-2 sm:mb-0" />
                <div className="sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Spent</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600 truncate">
                    {dashboardData.loading ? '...' : formatCurrency(dashboardData.totalSpent)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="text-center sm:flex sm:items-center sm:text-left">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto sm:mx-0 mb-2 sm:mb-0" />
                <div className="sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-600">
                    {dashboardData.loading ? '...' : dashboardData.totalOrders}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="text-center sm:flex sm:items-center sm:text-left">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mx-auto sm:mx-0 mb-2 sm:mb-0" />
                <div className="sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Items</p>
                  <p className="text-lg sm:text-2xl font-bold text-purple-600">
                    {dashboardData.loading ? '...' : dashboardData.totalItems}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="text-center sm:flex sm:items-center sm:text-left">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 mx-auto sm:mx-0 mb-2 sm:mb-0" />
                <div className="sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Catalogues</p>
                  <p className="text-lg sm:text-2xl font-bold text-orange-600">
                    {dashboardData.loading ? '...' : dashboardData.cataloguesCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sections.map(({ id, icon: Icon, title, desc }) => (
            <Card
              key={id}
              onClick={() => onNavigate(id)}
              className="hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm hover:scale-[1.02] active:scale-95 touch-manipulation"
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                  <div className="p-2 sm:p-3 rounded-full bg-gradient-to-r from-green-500 to-teal-500 text-white flex-shrink-0">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="truncate">{title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 sm:hidden">
          <Card className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
            <CardContent className="pt-4 pb-4">
              <div className="text-center">
                <h3 className="font-semibold mb-2">Quick Access</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => onNavigate('history')}
                    variant="outline"
                    className="text-green-700 bg-white/90 border-white/50 hover:bg-white text-xs p-2"
                    size="sm"
                  >
                    <Package className="w-3 h-3 mb-1" />
                    Orders
                  </Button>
                  <Button
                    onClick={() => onNavigate('forum')}
                    variant="outline"
                    className="text-green-700 bg-white/90 border-white/50 hover:bg-white text-xs p-2"
                    size="sm"
                  >
                    <MessageSquare className="w-3 h-3 mb-1" />
                    Forum
                  </Button>
                  <Button
                    onClick={() => onNavigate('catalogues')}
                    variant="outline"
                    className="text-green-700 bg-white/90 border-white/50 hover:bg-white text-xs p-2"
                    size="sm"
                  >
                    <BookOpen className="w-3 h-3 mb-1" />
                    Catalogues
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
