import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Loader2, DollarSign, Users, PieChart as PieChartIcon, Hash,
  BarChart2, TrendingUp, Target, Brain, AlertTriangle,
  Lightbulb, Package, Send, MessageSquare,
  CheckCircle, X, Eye, ArrowRight
} from 'lucide-react';

// Import the modularized AI components
import AIQueryInterface from './AIQueryInterface';
import SmartAlertsSystem from './SmartAlertsSystem';

// Type Definitions matching your database schema (unchanged)
type FactureItem = {
  id: number;
  invoice_id: string;
  "Client Name": string;
  "Date": string;
  "Product": string;
  "Quantity": string;
  "Price": string;
  status?: string;
};

type Product = {
  "Item ID": number;
  "Item Name": string;
  "CF.Category": string;
};

// Analytics types (unchanged)
type MonthlyRevenue = {
  month: string;
  revenue: number;
  orders: number;
  avgOrder: number;
  top_clients?: { name: string; revenue: number }[];
};

type TopClient = {
  client_name: string;
  total_sales: number;
  order_count: number;
  avg_order: number;
  last_order: string;
  recent_products?: string[];
};

type StatusDistribution = {
  name: string;
  value: number;
  revenue: number;
  customers: { name: string; orderCount: number; totalRevenue: number; }[];
};

type CategoryPerformance = {
  category: string;
  revenue: number;
  quantity: number;
  items_count: number;
  products?: string[];
};

type CustomerSegment = {
  segment: string;
  count: number;
  revenue: number;
  avg_order: number;
};

// Detail Modal Component (unchanged as it's a separate utility for showing data)
const DetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
  type: 'client' | 'product' | 'category' | 'month' | 'status-customers';
}> = ({ isOpen, onClose, title, data, type }) => {
  if (!data) return null;

  const renderDetailsContent = useCallback(() => {
    switch (type) {
      case 'client':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{data.total_sales?.toFixed(2)} MAD</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{data.order_count}</div>
                <div className="text-sm text-gray-600">Total Orders</div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-lg font-semibold mb-2">Average Order Value</div>
              <div className="text-xl text-purple-600">{data.avg_order?.toFixed(2)} MAD</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-lg font-semibold mb-2">Last Order Date</div>
              <div className="text-lg">{new Date(data.last_order).toLocaleDateString()}</div>
            </div>
            {data.recent_products && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-lg font-semibold mb-2">Recent Products</div>
                <div className="space-y-1">
                  {data.recent_products.slice(0, 5).map((product: string, idx: number) => (
                    <div key={idx} className="text-sm text-gray-700">• {product}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'category':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{data.revenue?.toFixed(2)} MAD</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{data.quantity}</div>
                <div className="text-sm text-gray-600">Units Sold</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{data.items_count}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
            </div>
            {data.products && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-lg font-semibold mb-2">Products in this Category</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {data.products.map((product: string, idx: number) => (
                    <div key={idx} className="text-sm text-gray-700">• {product}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'month':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{data.revenue?.toFixed(2)} MAD</div>
                <div className="text-sm text-gray-600">Revenue</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{data.orders}</div>
                <div className="text-sm text-gray-600">Orders</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{data.avgOrder?.toFixed(2)} MAD</div>
                <div className="text-sm text-gray-600">Avg Order</div>
              </div>
            </div>
            {data.top_clients && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-lg font-semibold mb-2">Top Clients This Month</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {data.top_clients.slice(0, 5).map((client: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{client.name}</span>
                      <span className="font-medium">{client.revenue.toFixed(2)} MAD</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'status-customers':
        return (
          <div className="space-y-4">
            <div className="text-lg font-semibold mb-2">Customers with '{data.statusName}' Orders</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{data.totalRevenue?.toFixed(2)} MAD</div>
                <div className="text-sm text-gray-600">Total Revenue for Status</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{data.totalOrders}</div>
                <div className="text-sm text-gray-600">Total Orders with Status</div>
              </div>
            </div>
            {data.customers && data.customers.length > 0 ? (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-lg font-semibold mb-2">Top Customers ({data.customers.length} unique)</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {data.customers.sort((a: any, b: any) => b.totalRevenue - a.totalRevenue).map((customer: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>• {customer.name} ({customer.orderCount} orders)</span>
                      <span className="font-medium">{customer.totalRevenue.toFixed(2)} MAD</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-gray-600">No customer details available for this status.</div>
            )}
          </div>
        );

      default:
        return <div>No details available</div>;
    }
  }, [data, type]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {title} - Detailed View
          </DialogTitle>
        </DialogHeader>
        {renderDetailsContent()}
      </DialogContent>
    </Dialog>
  );
};

// Main Interactive Analytics Dashboard Component
const InteractiveAnalyticsDashboard: React.FC = () => {
  // Mobile state
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Core data states
  const [liveFactures, setLiveFactures] = useState<FactureItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics states
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([]);

  // KPI states
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgOrderValue, setAverageOrderValue] = useState(0);
  const [uniqueClients, setUniqueClients] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [topCategory, setTopCategory] = useState('');

  // Interactive state
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filteredFactures, setFilteredFactures] = useState<FactureItem[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Detail modal states
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    title: string;
    data: any;
    type: 'client' | 'product' | 'category' | 'month' | 'status-customers';
  }>({
    isOpen: false,
    title: '',
    data: null,
    type: 'client'
  });

  // Helper functions
  const parseNumber = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const cleaned = value.toString().replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const parseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  const getProductCategory = useCallback((productName: string): string => {
    if (!productName || !products.length) return "Uncategorized";
    let product = products.find(p =>
      p["Item Name"]?.toLowerCase().trim() === productName.toLowerCase().trim()
    );
    if (!product) {
      product = products.find(p => {
        const itemName = p["Item Name"]?.toLowerCase() || '';
        const searchName = productName.toLowerCase();
        return itemName.includes(searchName) || searchName.includes(itemName);
      });
    }
    return product?.["CF.Category"] || "Uncategorized";
  }, [products]);

  // Fetch data from Supabase
  const fetchDataAndProcess = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: factureResult, error: factureError } = await supabase
        .from('facture')
        .select(`
          id,
          invoice_id,
          "Client Name",
          "Date",
          "Product",
          "Quantity",
          "Price",
          status
        `)
        .order('"Date"', { ascending: false });

      if (factureError) throw factureError;

      const { data: productsResult, error: productsError } = await supabase
        .from('products')
        .select(`
          "Item ID",
          "Item Name",
          "CF.Category"
        `);

      if (productsError) throw productsError;

      setLiveFactures(factureResult || []);
      setProducts(productsResult || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Filter and process analytics
  const filterDataByTimeframe = useCallback(() => {
    const now = new Date();
    let filtered = liveFactures;

    switch (selectedTimeframe) {
      case '30d':
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = liveFactures.filter(item => {
          const itemDate = parseDate(item["Date"]);
          return itemDate && itemDate >= thirtyDaysAgo;
        });
        break;
      case '90d':
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        filtered = liveFactures.filter(item => {
          const itemDate = parseDate(item["Date"]);
          return itemDate && itemDate >= ninetyDaysAgo;
        });
        break;
      case '1y':
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        filtered = liveFactures.filter(item => {
          const itemDate = parseDate(item["Date"]);
          return itemDate && itemDate >= oneYearAgo;
        });
        break;
      default:
        filtered = liveFactures;
    }

    setFilteredFactures(filtered);
    processAnalytics(filtered);
  }, [selectedTimeframe, liveFactures, getProductCategory]);

  // Main analytics processing
  const processAnalytics = useCallback((factures: FactureItem[]) => {
    const normalizedData = factures.map(f => ({
      client_name: f["Client Name"],
      date: f["Date"],
      product: f["Product"],
      quantity: parseNumber(f["Quantity"]),
      price: parseNumber(f["Price"]),
      total_amount: parseNumber(f["Quantity"]) * parseNumber(f["Price"]),
      status: f.status || 'Completed'
    }));

    // Monthly Revenue Analysis
    const revenueByMonth: { [key: string]: { revenue: number; orders: number; clients: Set<string>; } } = {};
    let totalRev = 0;
    let totalQty = 0;
    const clientSet = new Set<string>();

    normalizedData.forEach(item => {
      const date = parseDate(item.date);
      if (!date) return;

      const month = date.toISOString().slice(0, 7);
      if (!revenueByMonth[month]) {
        revenueByMonth[month] = { revenue: 0, orders: 0, clients: new Set() };
      }
      revenueByMonth[month].revenue += item.total_amount;
      revenueByMonth[month].orders += 1;
      revenueByMonth[month].clients.add(item.client_name);

      totalRev += item.total_amount;
      totalQty += item.quantity;
      if (item.client_name) {
        clientSet.add(item.client_name);
      }
    });

    const monthlyData = Object.keys(revenueByMonth)
      .sort()
      .map(month => {
        const monthData = revenueByMonth[month];
        const monthClients = normalizedData
          .filter(item => parseDate(item.date)?.toISOString().slice(0, 7) === month)
          .reduce((acc: { [key: string]: number }, item) => {
            acc[item.client_name] = (acc[item.client_name] || 0) + item.total_amount;
            return acc;
          }, {});

        const topClients = Object.entries(monthClients)
          .map(([name, revenue]) => ({ name, revenue }))
          .sort((a, b) => b.revenue - a.revenue);

        return {
          month,
          revenue: monthData.revenue,
          orders: monthData.orders,
          avgOrder: monthData.orders > 0 ? monthData.revenue / monthData.orders : 0,
          top_clients: topClients
        };
      });

    setMonthlyRevenue(monthlyData);

    // Top Clients Analysis
    const clientData: {
      [key: string]: {
        revenue: number;
        orders: number;
        lastOrder: string;
        products: Set<string>;
      }
    } = {};

    normalizedData.forEach(item => {
      const client = item.client_name || "Unknown";
      if (!clientData[client]) {
        clientData[client] = {
          revenue: 0,
          orders: 0,
          lastOrder: item.date,
          products: new Set()
        };
      }

      clientData[client].revenue += item.total_amount;
      clientData[client].orders += 1;
      clientData[client].products.add(item.product);

      const currentDate = parseDate(item.date);
      const lastDate = parseDate(clientData[client].lastOrder);

      if (currentDate && (!lastDate || currentDate > lastDate)) {
        clientData[client].lastOrder = item.date;
      }
    });

    const topClientsData = Object.keys(clientData)
      .map(client => ({
        client_name: client,
        total_sales: clientData[client].revenue,
        order_count: clientData[client].orders,
        avg_order: clientData[client].revenue / clientData[client].orders,
        last_order: clientData[client].lastOrder,
        recent_products: Array.from(clientData[client].products)
      }))
      .sort((a, b) => b.total_sales - a.total_sales)
      .slice(0, 15);

    setTopClients(topClientsData);

    // Status Distribution
    const statusData: { [key: string]: { count: number; revenue: number; customers: { [clientName: string]: { orderCount: number; totalRevenue: number } }; } } = {};
    normalizedData.forEach(item => {
      const status = item.status;
      const client = item.client_name;
      const amount = item.total_amount;

      if (!statusData[status]) {
        statusData[status] = { count: 0, revenue: 0, customers: {} };
      }
      statusData[status].count += 1;
      statusData[status].revenue += amount;

      if (!statusData[status].customers[client]) {
        statusData[status].customers[client] = { orderCount: 0, totalRevenue: 0 };
      }
      statusData[status].customers[client].orderCount += 1;
      statusData[status].customers[client].totalRevenue += amount;
    });

    const statusDistData = Object.keys(statusData).map(status => ({
      name: status,
      value: statusData[status].count,
      revenue: statusData[status].revenue,
      customers: Object.entries(statusData[status].customers).map(([name, data]) => ({ name, ...data }))
    }));

    setStatusDistribution(statusDistData);

    // Category Performance Analysis
    const categoryData: {
      [key: string]: {
        revenue: number;
        quantity: number;
        items: number;
        products: Set<string>;
      }
    } = {};

    normalizedData.forEach(item => {
      const category = getProductCategory(item.product);

      if (!categoryData[category]) {
        categoryData[category] = {
          revenue: 0,
          quantity: 0,
          items: 0,
          products: new Set()
        };
      }

      categoryData[category].revenue += item.total_amount;
      categoryData[category].quantity += item.quantity;
      categoryData[category].items += 1;
      categoryData[category].products.add(item.product);
    });

    const categoryPerf = Object.keys(categoryData).map(category => ({
      category,
      revenue: categoryData[category].revenue,
      quantity: categoryData[category].quantity,
      items_count: categoryData[category].items,
      products: Array.from(categoryData[category].products)
    })).sort((a, b) => b.revenue - a.revenue);

    setCategoryPerformance(categoryPerf);

    // Customer Segmentation
    const segments = [
      { segment: 'VIP (>50k MAD)', count: 0, revenue: 0, avg_order: 0 },
      { segment: 'Regular (10k-50k MAD)', count: 0, revenue: 0, avg_order: 0 },
      { segment: 'Occasional (<10k MAD)', count: 0, revenue: 0, avg_order: 0 }
    ];

    topClientsData.forEach(client => {
      if (client.total_sales > 50000) {
        segments[0].count++;
        segments[0].revenue += client.total_sales;
      } else if (client.total_sales > 10000) {
        segments[1].count++;
        segments[1].revenue += client.total_sales;
      } else {
        segments[2].count++;
        segments[2].revenue += client.total_sales;
      }
    });

    segments.forEach(segment => {
      segment.avg_order = segment.count > 0 ? segment.revenue / segment.count : 0;
    });

    setCustomerSegments(segments);

    // Set KPIs
    setTotalRevenue(totalRev);
    setTotalOrders(normalizedData.length);
    setAverageOrderValue(normalizedData.length > 0 ? totalRev / normalizedData.length : 0);
    setUniqueClients(clientSet.size);
    setTotalItems(totalQty);
    setTopCategory(categoryPerf[0]?.category || 'N/A');
  }, [getProductCategory]);

  // Chart click handlers
  const handleClientClick = (data: any) => {
    const clientDetails = topClients.find(c => c.client_name === data.client_name);
    if (clientDetails) {
      setDetailModal({
        isOpen: true,
        title: data.client_name,
        data: clientDetails,
        type: 'client'
      });
    }
  };

  const handleCategoryClick = (data: any) => {
    const categoryDetails = categoryPerformance.find(c => c.category === data.category);
    if (categoryDetails) {
      setDetailModal({
        isOpen: true,
        title: data.category,
        data: categoryDetails,
        type: 'category'
      });
    }
  };

  const handleMonthClick = (data: any) => {
    const monthDetails = monthlyRevenue.find(m => m.month === data.month);
    if (monthDetails) {
      setDetailModal({
        isOpen: true,
        title: `${data.month} Performance`,
        data: monthDetails,
        type: 'month'
      });
    }
  };

  const handlePieClick = (data: any) => {
    const statusDetails = statusDistribution.find(s => s.name === data.name);
    if (statusDetails) {
      setDetailModal({
        isOpen: true,
        title: `${data.name} Status Details`,
        data: {
          statusName: data.name,
          totalOrders: statusDetails.value,
          totalRevenue: statusDetails.revenue,
          customers: statusDetails.customers
        },
        type: 'status-customers'
      });
    }
  };

  // Effects
  useEffect(() => {
    fetchDataAndProcess();
  }, []);

  useEffect(() => {
    if (liveFactures.length > 0) {
      filterDataByTimeframe();
    }
  }, [filterDataByTimeframe, liveFactures]);

  // MOBILE-OPTIMIZED KPI RENDERING
  const renderKPIMetric = (title: string, value: string | number, icon: React.ElementType, description: string, color: string = "text-gray-500") => (
    <div className="flex flex-col items-center justify-center p-3 sm:p-4 text-center bg-white rounded-lg shadow-sm border border-gray-100 min-h-[100px] sm:min-h-[120px] transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-center mb-2">
        {React.createElement(icon, { className: `h-5 w-5 sm:h-6 sm:w-6 ${color}` })}
      </div>
      <div className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-1 leading-tight">
        {typeof value === 'string' && value.length > 12 ? (
          <span className="text-sm sm:text-base">{value}</span>
        ) : (
          value
        )}
      </div>
      <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 text-center leading-tight">{title}</h3>
      <p className="text-xs text-gray-500 text-center leading-tight">{description}</p>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2 text-center">Loading Analytics...</h2>
        <p className="text-gray-500 text-center">Processing your business data</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-br from-red-50 to-pink-50 px-4">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2 text-center">Error Loading Data</h2>
        <p className="text-gray-500 mb-4 text-center px-4">{error}</p>
        <Button onClick={fetchDataAndProcess}>Try Again</Button>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 flex flex-col ${isMobile ? 'pb-20' : ''}`}>
      <main className="flex-1 py-4 px-3 sm:px-4 md:px-6 lg:px-8">
        <DetailModal
          isOpen={detailModal.isOpen}
          onClose={() => setDetailModal(prev => ({ ...prev, isOpen: false }))}
          title={detailModal.title}
          data={detailModal.data}
          type={detailModal.type}
        />

        {/* Dashboard Title */}
        <div className="text-center mb-6 pt-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2 px-2">
            Interactive Business Analytics Dashboard
          </h1>
          <p className="text-gray-600 text-sm md:text-base px-4">Real-time insights from your live Phytoclinic data</p>
          <p className="text-xs text-gray-500 mt-1 px-4">
            Live Data: {liveFactures.length} transactions • Products: {products.length} • Click charts for details
          </p>
        </div>

        {/* KPI Metrics - Mobile optimized grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
          {renderKPIMetric("Total Revenue", `${totalRevenue.toLocaleString()} MAD`, DollarSign, "All time revenue", "text-green-500")}
          {renderKPIMetric("Total Orders", totalOrders.toLocaleString(), Hash, "All transactions", "text-blue-500")}
          {renderKPIMetric("Avg. Order", `${avgOrderValue.toFixed(0)} MAD`, BarChart2, "Average per transaction", "text-purple-500")}
          {renderKPIMetric("Unique Clients", uniqueClients, Users, "Active customers", "text-orange-500")}
          {renderKPIMetric("Total Items", totalItems.toLocaleString(), Package, "Items furnished", "text-pink-500")}
          {renderKPIMetric("Top Category", topCategory, Target, "Best performing", "text-indigo-500")}
        </div>

        {/* Timeframe Selection - Mobile optimized buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-6 px-2">
          {[
            { key: 'all', label: 'All Time' },
            { key: '30d', label: '30 Days' },
            { key: '90d', label: '90 Days' },
            { key: '1y', label: '1 Year' }
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={selectedTimeframe === key ? 'default' : 'outline'}
              onClick={() => setSelectedTimeframe(key)}
              className="transition-all duration-200 text-xs sm:text-sm px-3 py-2 flex-grow sm:flex-grow-0 min-w-0"
              size="sm"
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Main Tabs - Mobile optimized */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Desktop TabsList - Hidden on mobile */}
          <TabsList className={`${isMobile ? 'hidden' : 'grid'} w-full grid-cols-4 bg-white shadow-sm rounded-lg p-1 mb-4`}>
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-md transition-all duration-200 text-sm py-2">Overview</TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-md transition-all duration-200 text-sm py-2">Customers</TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-md transition-all duration-200 text-sm py-2">Products</TabsTrigger>
            <TabsTrigger value="ai-insights" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-md transition-all duration-200 text-sm py-2">AI Insights</TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Monthly Revenue Chart */}
              <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                  <div className="flex items-center text-base sm:text-lg font-semibold text-gray-800">
                    <BarChart2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                    <span className="text-sm sm:text-base">Monthly Revenue Trend</span>
                  </div>
                  <Badge variant="outline" className="text-xs self-start sm:self-center">Click for details</Badge>
                </div>
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                  <AreaChart data={monthlyRevenue}>
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      interval={isMobile ? 1 : 0}
                    />
                    <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === 'revenue' ? `${value.toLocaleString()} MAD` : value,
                        name === 'revenue' ? 'Revenue' : name === 'orders' ? 'Orders' : 'Avg Order'
                      ]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      fill="#93c5fd"
                      onClick={handleMonthClick}
                      style={{ cursor: 'pointer' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 mt-2 text-center px-2">
                  💡 Click on any month to see detailed breakdown
                </p>
              </div>

              {/* Status Distribution */}
              <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                  <div className="flex items-center text-base sm:text-lg font-semibold text-gray-800">
                    <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-500" />
                    <span className="text-sm sm:text-base">Order Status Distribution</span>
                  </div>
                  <Badge variant="outline" className="text-xs self-start sm:self-center">Click slices</Badge>
                </div>
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={isMobile ? 60 : 80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      onClick={handlePieClick}
                      style={{ cursor: 'pointer' }}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string, props: any) => [
                      `${value} orders (${props.payload.revenue.toLocaleString()} MAD)`,
                      name
                    ]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 mt-2 text-center px-2">
                  💡 Click on any slice to see customer details
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            {/* Top Clients Table */}
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                <div className="flex items-center text-base sm:text-lg font-semibold text-gray-800">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-purple-500" />
                  <span className="text-sm sm:text-base">Top 15 Clients by Revenue</span>
                </div>
                <Badge variant="outline" className="text-xs self-start sm:self-center">Click rows</Badge>
              </div>
              <ScrollArea className={`${isMobile ? 'h-[300px]' : 'h-[400px]'}`}>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Orders</th>
                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Avg</th>
                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Last Order</th>
                        <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topClients.map((client, index) => (
                        <tr
                          key={index}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleClientClick(client)}
                        >
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">#{index + 1}</td>
                          <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-900 max-w-[100px] sm:max-w-none truncate">{client.client_name}</td>
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-green-600 font-semibold">{client.total_sales.toLocaleString()} MAD</td>
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden sm:table-cell">{client.order_count}</td>
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">{client.avg_order.toFixed(0)} MAD</td>
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden lg:table-cell">
                            {parseDate(client.last_order)?.toLocaleDateString() || 'Unknown'}
                          </td>
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-blue-500">
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
              <p className="text-xs text-gray-500 mt-2 text-center px-2">
                💡 Click on any client row to see detailed analytics
              </p>
            </div>

            {/* Customer Segments */}
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center mb-4 text-base sm:text-lg font-semibold text-gray-800">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-orange-500" />
                <span className="text-sm sm:text-base">Customer Segments</span>
              </div>
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                <BarChart data={customerSegments}>
                  <XAxis 
                    dataKey="segment" 
                    tick={{ fontSize: isMobile ? 9 : 12 }}
                    angle={isMobile ? -45 : 0}
                    textAnchor={isMobile ? 'end' : 'middle'}
                    height={isMobile ? 60 : 40}
                  />
                  <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <Tooltip formatter={(value: number, name: string) => [
                    name === 'count' ? value : `${value.toLocaleString()} MAD`,
                    name === 'count' ? 'Customers' : name === 'revenue' ? 'Revenue' : 'Avg Order'
                  ]} />
                  <Legend />
                  <Bar dataKey="count" name="Customers" fill="#f97316" />
                  <Bar dataKey="revenue" name="Revenue" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            {/* Category Performance */}
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                <div className="flex items-center text-base sm:text-lg font-semibold text-gray-800">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-yellow-500" />
                  <span className="text-sm sm:text-base">Product Category Performance</span>
                </div>
                <Badge variant="outline" className="text-xs self-start sm:self-center">Click bars</Badge>
              </div>
              <div className="flex flex-wrap justify-start gap-2 mb-4 overflow-x-auto pb-2">
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  className="cursor-pointer whitespace-nowrap text-xs px-2 py-1 h-8"
                  onClick={() => setSelectedCategory(null)}
                  size="sm"
                >
                  All Categories
                </Button>
                {Array.from(new Set(categoryPerformance.map(p => p.category))).map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    className="cursor-pointer whitespace-nowrap text-xs px-2 py-1 h-8"
                    onClick={() => setSelectedCategory(category)}
                    size="sm"
                  >
                    {category}
                  </Button>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
                <BarChart
                  data={selectedCategory ? categoryPerformance.filter(c => c.category === selectedCategory) : categoryPerformance}
                  onClick={handleCategoryClick}
                >
                  <XAxis 
                    dataKey="category" 
                    angle={-45} 
                    textAnchor="end" 
                    height={isMobile ? 80 : 80}
                    tick={{ fontSize: isMobile ? 9 : 12 }}
                  />
                  <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <Tooltip formatter={(value: number, name: string) => [
                    name === 'quantity' ? value : name === 'items_count' ? value : `${value.toLocaleString()} MAD`,
                    name === 'revenue' ? 'Revenue' : name === 'quantity' ? 'Quantity' : 'Items'
                  ]} />
                  <Legend />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="#3b82f6"
                    style={{ cursor: 'pointer' }}
                    onClick={handleCategoryClick}
                  />
                  <Bar
                    dataKey="quantity"
                    name="Quantity"
                    fill="#10b981"
                    style={{ cursor: 'pointer' }}
                    onClick={handleCategoryClick}
                  />
                  <Bar
                    dataKey="items_count"
                    name="Items"
                    fill="#f59e0b"
                    style={{ cursor: 'pointer' }}
                    onClick={handleCategoryClick}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-2 text-center px-2">
                💡 Click on any category bar to see detailed product breakdown
              </p>
            </div>
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-4">
            {/* AI Query Interface */}
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <AIQueryInterface factureData={filteredFactures} products={products} />
            </div>

            {/* Smart Alerts System */}
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
                <SmartAlertsSystem factureData={filteredFactures} products={products} />
            </div>

            {/* Data Summary */}
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
              <div className="flex items-center mb-4 text-base sm:text-lg font-semibold text-blue-700">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="text-sm sm:text-base">Live Data Summary</span>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{liveFactures.length}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Live Database Records</div>
                  <div className="text-xs text-gray-500 mt-1">From Supabase facture table</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{products.length}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Product Catalog</div>
                  <div className="text-xs text-gray-500 mt-1">For category mapping</div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">{uniqueClients}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Active Customers</div>
                  <div className="text-xs text-gray-500 mt-1">Unique client relationships</div>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-xs sm:text-sm text-gray-600">
                <p className="flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Real-time Updates:</strong> All data is automatically synced from your live database</span>
                </p>
                <p className="flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Interactive Charts:</strong> Click on any chart element to see detailed breakdowns</span>
                </p>
                <p className="flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>AI Insights:</strong> Smart alerts and natural language querying available</span>
                </p>
                <p className="flex items-start">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Time Filtering:</strong> Analyze data across different time periods</span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center mb-4 text-base sm:text-lg font-semibold text-purple-700">
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="text-sm sm:text-base">Quick Analytics Actions</span>
              </div>
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 hover:bg-white/80 text-xs sm:text-sm"
                  onClick={() => setActiveTab("ai-insights")}
                >
                  <Users className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                  <span>Top Customers</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 hover:bg-white/80 text-xs sm:text-sm"
                  onClick={() => setActiveTab("ai-insights")}
                >
                  <Package className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                  <span>Best Products</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 hover:bg-white/80 text-xs sm:text-sm"
                  onClick={() => setActiveTab("ai-insights")}
                >
                  <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                  <span>Revenue Overview</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 hover:bg-white/80 text-xs sm:text-sm"
                  onClick={fetchDataAndProcess}
                >
                  <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
                  <span>Refresh Data</span>
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg py-2 z-50">
          <div className="flex justify-around items-center px-2">
            <Button 
              size="sm" 
              variant="ghost" 
              className={`text-xs flex flex-col items-center p-2 h-auto min-w-0 flex-1 ${activeTab === 'overview' ? 'text-blue-600' : 'text-gray-700'}`} 
              onClick={() => setActiveTab('overview')}
            >
              <BarChart2 className="w-5 h-5 mb-1" />
              <span className="truncate">Overview</span>
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className={`text-xs flex flex-col items-center p-2 h-auto min-w-0 flex-1 ${activeTab === 'customers' ? 'text-green-600' : 'text-gray-700'}`} 
              onClick={() => setActiveTab('customers')}
            >
              <Users className="w-5 h-5 mb-1" />
              <span className="truncate">Customers</span>
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className={`text-xs flex flex-col items-center p-2 h-auto min-w-0 flex-1 ${activeTab === 'products' ? 'text-purple-600' : 'text-gray-700'}`} 
              onClick={() => setActiveTab('products')}
            >
              <Package className="w-5 h-5 mb-1" />
              <span className="truncate">Products</span>
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className={`text-xs flex flex-col items-center p-2 h-auto min-w-0 flex-1 ${activeTab === 'ai-insights' ? 'text-orange-600' : 'text-gray-700'}`} 
              onClick={() => setActiveTab('ai-insights')}
            >
              <Brain className="w-5 h-5 mb-1" />
              <span className="truncate">AI Insights</span>
            </Button>
          </div>
        </footer>
      )}

      {/* Desktop Footer */}
      {!isMobile && (
        <footer className="mt-8 text-center pb-4">
          <div className="inline-block bg-white rounded-full px-6 py-3 shadow-lg border border-gray-200">
            <p className="text-gray-600 font-medium text-sm">
              🚀 Interactive Analytics Dashboard • Real-time Business Intelligence • Click anywhere to explore
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default InteractiveAnalyticsDashboard;