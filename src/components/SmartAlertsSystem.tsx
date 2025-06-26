import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  TrendingUp,
  Users,
  Package,
  DollarSign,
  Bell,
  X,
  CheckCircle,
  Info,
  Target,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

type SmartAlert = {
  id: string;
  type: 'opportunity' | 'warning' | 'insight' | 'action_required';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action_items: string[];
  data?: any;
  timestamp: Date;
  dismissed?: boolean;
  category: 'revenue' | 'customers' | 'products' | 'operations';
};

interface FactureItemRaw {
  id: number;
  invoice_id: string;
  "Client Name": string;
  "Date": string;
  "Product": string;
  "Quantity": string;
  "Price": string;
  status?: string;
}

interface ProductRaw {
  "Item ID": number;
  "Item Name": string;
  "CF.Category": string;
}

interface SmartAlertsSystemProps {
  factureData: FactureItemRaw[];
  products: ProductRaw[]; // Passed products to enable category lookup if needed
}

const SmartAlertsSystem: React.FC<SmartAlertsSystemProps> = ({ factureData, products }) => {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [showDismissed, setShowDismissed] = useState(false);

  // Helper function to safely parse numbers
  const parseNumber = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;

    const cleaned = value.toString().replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper function to safely parse dates
  const parseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  // Helper function to get category for a product (duplicate logic, can be passed down or centralized if products data is large)
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
  }, [products]); // Depends on products data

  // Generate smart alerts based on data analysis - ENHANCED
  const generateAlerts = useCallback(() => {
    const newAlerts: SmartAlert[] = [];
    const now = new Date();

    if (factureData.length === 0) {
      setAlerts([]);
      return;
    }

    // Normalized data for easier processing
    const normalizedData = factureData.map(f => ({
      client_name: f["Client Name"],
      date: parseDate(f["Date"]),
      product: f["Product"],
      quantity: parseNumber(f["Quantity"]),
      price: parseNumber(f["Price"]),
      total_amount: parseNumber(f["Quantity"]) * parseNumber(f["Price"]),
      status: f.status || 'Completed'
    }));


    // 1. Customer Churn Risk Analysis
    const customerLastOrder: { [key: string]: { date: Date; revenue: number; orders: number } } = {};
    normalizedData.forEach(item => {
      const client = item.client_name || 'Unknown';
      const orderDate = item.date;

      if (orderDate) {
        if (!customerLastOrder[client] || orderDate > customerLastOrder[client].date) {
          customerLastOrder[client] = {
            date: orderDate,
            revenue: (customerLastOrder[client]?.revenue || 0) + item.total_amount,
            orders: (customerLastOrder[client]?.orders || 0) + 1
          };
        } else {
          // If the current item's date is not newer, just aggregate revenue/orders
          customerLastOrder[client].revenue += item.total_amount;
          customerLastOrder[client].orders += 1;
        }
      }
    });

    // Find high-value customers at risk
    const highValueAtRiskCustomers = Object.entries(customerLastOrder)
      .map(([name, data]) => {
        const daysSinceLastOrder = Math.floor((now.getTime() - data.date.getTime()) / (1000 * 60 * 60 * 24));
        return { name, ...data, daysSinceLastOrder };
      })
      .filter(customer => customer.daysSinceLastOrder > 45 && customer.revenue > 1000) // Adjusted threshold for value
      .sort((a, b) => b.revenue - a.revenue);

    if (highValueAtRiskCustomers.length > 0) {
      newAlerts.push({
        id: 'churn-risk-' + Date.now(),
        type: 'warning',
        priority: 'high',
        title: `${highValueAtRiskCustomers.length} High-Value Customers at Risk`,
        description: `Customers representing significant revenue (${highValueAtRiskCustomers.reduce((sum, c) => sum + c.revenue, 0).toFixed(2)} MAD) haven't ordered in over 45 days.`,
        action_items: [
          'Send personalized retention emails',
          'Offer exclusive discounts or loyalty benefits',
          'Schedule personal check-in calls',
          'Analyze why they stopped ordering'
        ],
        data: highValueAtRiskCustomers.slice(0, 5),
        timestamp: now,
        category: 'customers'
      });
    }

    // 2. Revenue Opportunity Analysis (More robust growth/decline detection)
    const monthlyRevenue: { [key: string]: number } = {};
    normalizedData.forEach(item => {
      if (!item.date) return;
      const month = item.date.toISOString().slice(0, 7);
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + item.total_amount;
    });

    const revenueEntries = Object.entries(monthlyRevenue).sort((a, b) => a[0].localeCompare(b[0]));
    if (revenueEntries.length >= 3) {
      const latestMonthRevenue = revenueEntries[revenueEntries.length - 1][1];
      const secondLatestMonthRevenue = revenueEntries[revenueEntries.length - 2][1];
      const thirdLatestMonthRevenue = revenueEntries[revenueEntries.length - 3][1];

      const growthRateLastMonth = secondLatestMonthRevenue !== 0 ? ((latestMonthRevenue - secondLatestMonthRevenue) / secondLatestMonthRevenue) * 100 : 0;
      const growthRateThreeMonths = thirdLatestMonthRevenue !== 0 ? ((latestMonthRevenue - thirdLatestMonthRevenue) / thirdLatestMonthRevenue) * 100 : 0;

      if (growthRateLastMonth > 20) { // Significant short-term growth
        newAlerts.push({
          id: 'revenue-surge-' + Date.now(),
          type: 'opportunity',
          priority: 'high',
          title: 'Sudden Revenue Surge Detected!',
          description: `Revenue increased by ${growthRateLastMonth.toFixed(1)}% in the last month. Investigate the cause and capitalize.`,
          action_items: [
            'Identify products/campaigns driving the surge',
            'Increase marketing spend on successful channels',
            'Ensure inventory can meet increased demand'
          ],
          data: { growthRate: growthRateLastMonth, month: revenueEntries[revenueEntries.length - 1][0] },
          timestamp: now,
          category: 'revenue'
        });
      } else if (growthRateLastMonth < -15) { // Significant short-term decline
         newAlerts.push({
          id: 'revenue-drop-' + Date.now(),
          type: 'warning',
          priority: 'high',
          title: 'Sharp Revenue Drop Detected!',
          description: `Revenue decreased by ${Math.abs(growthRateLastMonth).toFixed(1)}% in the last month. Immediate investigation required.`,
          action_items: [
            'Review recent marketing campaigns and website performance',
            'Check for customer feedback or service issues',
            'Analyze competitor activities'
          ],
          data: { growthRate: growthRateLastMonth, month: revenueEntries[revenueEntries.length - 1][0] },
          timestamp: now,
          category: 'revenue'
        });
      }
      // General growth over 3 months
      if (growthRateThreeMonths > 10) {
        newAlerts.push({
          id: 'revenue-growth-3m-' + Date.now(),
          type: 'opportunity',
          priority: 'medium',
          title: 'Consistent Revenue Growth',
          description: `Revenue has shown a healthy growth of ${growthRateThreeMonths.toFixed(1)}% over the last three months.`,
          action_items: [
            'Maintain successful strategies',
            'Explore new market segments',
            'Invest in customer loyalty programs'
          ],
          data: { growthRate: growthRateThreeMonths, trend: revenueEntries.slice(-3) },
          timestamp: now,
          category: 'revenue'
        });
      }
    }


    // 3. Product Performance Analysis (Improved stale product detection & new "rising star")
    const productSales: { [key: string]: { revenue: number; quantity: number; lastSold: Date | null; monthlySales: { [month: string]: number } } } = {};
    normalizedData.forEach(item => {
      const product = item.product || 'Unknown';
      const amount = item.total_amount;
      const qty = item.quantity;
      const date = item.date;
      const month = date ? date.toISOString().slice(0, 7) : 'Unknown';

      if (!productSales[product]) {
        productSales[product] = { revenue: 0, quantity: 0, lastSold: null, monthlySales: {} };
      }
      productSales[product].revenue += amount;
      productSales[product].quantity += qty;
      if (date && (!productSales[product].lastSold || date > productSales[product].lastSold!)) {
        productSales[product].lastSold = date;
      }
      if (month) {
        productSales[product].monthlySales[month] = (productSales[product].monthlySales[month] || 0) + amount;
      }
    });

    const productPerformance = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    const topProduct = productPerformance[0];
    if (topProduct && topProduct.revenue > 10000) { // Higher threshold for "star" product
      newAlerts.push({
        id: 'top-product-' + Date.now(),
        type: 'insight',
        priority: 'medium',
        title: `${topProduct.name} is Your Top Performer`,
        description: `This product generated ${topProduct.revenue.toFixed(2)} MAD (${topProduct.quantity} units sold) and consistently leads sales.`,
        action_items: [
          'Prioritize stock levels for this product',
          'Create premium marketing assets',
          'Analyze its customer base for look-alike targeting'
        ],
        data: topProduct,
        timestamp: now,
        category: 'products'
      });
    }

    // Rising Star Product Detection - MODIFIED TO SUMMARIZE TOP 3
    const risingStarProducts: { name: string; growth: number; lastMonthSales: number }[] = [];
    productPerformance.forEach(product => {
        const months = Object.keys(product.monthlySales).sort();
        if (months.length >= 2) {
            const lastMonthSales = product.monthlySales[months[months.length - 1]] || 0;
            const prevMonthSales = product.monthlySales[months[months.length - 2]] || 0;
            const growth = prevMonthSales !== 0 ? ((lastMonthSales - prevMonthSales) / prevMonthSales) * 100 : (lastMonthSales > 0 && prevMonthSales === 0 ? 1000 : 0); // High growth if previous was zero and current is positive

            if (growth > 50 && lastMonthSales > 500) { // Significant growth and minimum sales volume
                risingStarProducts.push({ product: product.name, growth, lastMonthSales });
            }
        }
    });

    if (risingStarProducts.length > 0) {
        // Sort by growth rate descending and take top 3 for summary
        const topRisingStars = risingStarProducts.sort((a, b) => b.growth - a.growth).slice(0, 3);
        const productNames = topRisingStars.map(p => p.product).join(', ');
        const totalGrowth = topRisingStars.reduce((sum, p) => sum + p.growth, 0) / topRisingStars.length;

        newAlerts.push({
            id: 'rising-star-product-summary-' + Date.now(),
            type: 'opportunity',
            priority: 'high',
            title: `Rising Star Products Detected: ${productNames}`,
            description: `These products show significant growth (avg. ${totalGrowth.toFixed(1)}% increase last month). Focus on them!`,
            action_items: [
                'Allocate more marketing budget to these products',
                'Feature them prominently on your website and campaigns',
                'Gather customer testimonials and reviews'
            ],
            data: topRisingStars, // Pass detailed data for potential drill-down in modal if needed
            timestamp: now,
            category: 'products'
        });
    }


    // Stale inventory with specific thresholds
    const staleProducts = productPerformance.filter(product => {
      if (!product.lastSold) return true; // Products never sold
      const daysSinceLastSold = Math.floor((now.getTime() - product.lastSold.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceLastSold > 90 && product.quantity > 0; // Only if quantity is relevant
    });

    if (staleProducts.length > 0) {
      newAlerts.push({
        id: 'stale-inventory-' + Date.now(),
        type: 'action_required',
        priority: 'medium',
        title: `${staleProducts.length} Products Have Stale Inventory`,
        description: `These products haven't sold in over 90 days, tying up capital. Revenue tied: ${staleProducts.reduce((sum, p) => sum + p.revenue, 0).toFixed(2)} MAD.`,
        action_items: [
          'Implement aggressive clearance sales',
          'Re-evaluate pricing or marketing strategy',
          'Consider bundling with faster-moving items',
          'Remove from active listings if unsellable'
        ],
        data: staleProducts.slice(0, 5),
        timestamp: now,
        category: 'products'
      });
    }

    // 4. Seasonal Opportunities (Ensuring products are from your product catalog)
    const currentMonth = now.getMonth() + 1;
    const monthlyProductSalesHistorical: { [month: number]: { [productName: string]: number } } = {};

    factureData.forEach(item => {
      const month = parseDate(item.Date)?.getMonth() + 1;
      const product = item.product;
      const amount = item.total_amount;

      if (month) {
        if (!monthlyProductSalesHistorical[month]) monthlyProductSalesHistorical[month] = {};
        monthlyProductSalesHistorical[month][product] = (monthlyProductSalesHistorical[month][product] || 0) + amount;
      }
    });

    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    if (monthlyProductSalesHistorical[nextMonth] && Object.keys(monthlyProductSalesHistorical[nextMonth]).length > 0) {
      const nextMonthTopProducts = Object.entries(monthlyProductSalesHistorical[nextMonth])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (nextMonthTopProducts.length > 0) {
        newAlerts.push({
          id: 'seasonal-opportunity-' + Date.now(),
          type: 'opportunity',
          priority: 'medium',
          title: 'Seasonal Opportunity Approaching',
          description: `Based on historical data, next month (${new Date(now.getFullYear(), nextMonth -1, 1).toLocaleString('default', { month: 'long' })}) typically shows strong sales for products like: ${nextMonthTopProducts.map(p => p[0]).join(', ')}.`,
          action_items: [
            'Increase stock for seasonal favorites',
            'Prepare targeted marketing campaigns for these products',
            'Offer early bird discounts to existing customers'
          ],
          data: nextMonthTopProducts,
          timestamp: now,
          category: 'operations'
        });
      }
    }

    // 5. Cross-sell Opportunity (Refined logic to focus on high-potential customers)
    const customerProducts: { [customer: string]: Set<string> } = {};
    normalizedData.forEach(item => {
      const customer = item.client_name;
      const product = item.product;
      if (!customerProducts[customer]) customerProducts[customer] = new Set();
      customerProducts[customer].add(product);
    });

    const highPotentialSingleProductCustomers = Object.entries(customerProducts)
      .filter(([customer, productsSet]) => productsSet.size === 1 && customerLastOrder[customer]?.revenue > 500) // Only if they bought something substantial
      .length;

    if (highPotentialSingleProductCustomers > 0) {
      newAlerts.push({
        id: 'cross-sell-opportunity-' + Date.now(),
        type: 'opportunity',
        priority: 'low',
        title: `${highPotentialSingleProductCustomers} High-Potential Single-Product Customers`,
        description: 'These customers show loyalty but haven\'t explored your full product range. Great cross-selling potential.',
        action_items: [
          'Send personalized product recommendations',
          'Offer bundle discounts on complementary items',
          'Create educational content about other product benefits'
        ],
        data: { count: highPotentialSingleProductCustomers },
        timestamp: now,
        category: 'customers'
      });
    }


    setAlerts(newAlerts);
  }, [factureData, products, getProductCategory]); // Depend on factureData and products for alerts

  useEffect(() => {
    generateAlerts();
  }, [factureData, products, generateAlerts]); // Depend on generateAlerts useCallback

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  };

  const getAlertIcon = (type: SmartAlert['type']) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'opportunity': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'insight': return <Info className="w-5 h-5 text-blue-500" />;
      case 'action_required': return <Target className="w-5 h-5 text-orange-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: SmartAlert['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: SmartAlert['category']) => {
    switch (category) {
      case 'revenue': return <DollarSign className="w-4 h-4" />;
      case 'customers': return <Users className="w-4 h-4" />;
      case 'products': return <Package className="w-4 h-4" />;
      case 'operations': return <Calendar className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const visibleAlerts = alerts.filter(alert =>
    showDismissed || !dismissedAlerts.includes(alert.id)
  );

  const highPriorityCount = visibleAlerts.filter(alert => alert.priority === 'high').length;
  const mediumPriorityCount = visibleAlerts.filter(alert => alert.priority === 'medium').length;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="w-5 h-5 mr-2 text-blue-600" />
            Smart Alerts & Recommendations
            {visibleAlerts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {visibleAlerts.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {highPriorityCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {highPriorityCount} High
              </Badge>
            )}
            {mediumPriorityCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                {mediumPriorityCount} Medium
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDismissed(!showDismissed)}
              className="text-xs"
            >
              {showDismissed ? 'Hide Dismissed' : 'Show Dismissed'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {visibleAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <div className="font-medium">All caught up!</div>
            <div className="text-sm">No new alerts or recommendations at this time.</div>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {visibleAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border-l-4 p-4 rounded-lg ${getPriorityColor(alert.priority)} ${
                    dismissedAlerts.includes(alert.id) ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {getCategoryIcon(alert.category)}
                            <span className="ml-1 capitalize">{alert.category}</span>
                          </Badge>
                          <Badge
                            variant={alert.priority === 'high' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {alert.priority}
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-700">{alert.description}</p>

                        {/* Data visualization for specific alerts */}
                        {alert.data && alert.type === 'warning' && alert.category === 'customers' && (
                          <div className="bg-white rounded-lg p-3 space-y-2">
                            <div className="text-xs font-medium text-gray-600">At-Risk Customers:</div>
                            {Array.isArray(alert.data) && alert.data.slice(0, 3).map((customer: any, index: number) => (
                              <div key={index} className="flex justify-between text-xs">
                                <span>{customer.name}</span>
                                <span className="text-red-600">{customer.daysSinceLastOrder} days ago</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {alert.data && alert.type === 'opportunity' && alert.category === 'revenue' && (
                          <div className="bg-white rounded-lg p-3">
                            <div className="flex items-center gap-2 text-sm">
                              {alert.data.growthRate > 0 ? (
                                <ArrowUp className="w-4 h-4 text-green-500" />
                              ) : (
                                <ArrowDown className="w-4 h-4 text-red-500" />
                              )}
                              <span className="font-medium">
                                {Math.abs(alert.data.growthRate).toFixed(1)}%
                                {alert.data.growthRate > 0 ? ' growth' : ' decline'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Updated: Data visualization for Rising Star Products */}
                        {alert.data && alert.category === 'products' && alert.title.includes('Rising Star') && (
                          <div className="bg-white rounded-lg p-3">
                            <div className="text-xs font-medium text-gray-600 mb-2">
                              Top Rising Star Products:
                            </div>
                            {Array.isArray(alert.data) && alert.data.slice(0, 3).map((product: any, index: number) => (
                              <div key={index} className="flex justify-between text-xs">
                                <span>{product.product}</span>
                                <span>+{product.growth?.toFixed(1)}% ({product.lastMonthSales?.toFixed(0)} MAD)</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Existing: Data visualization for other product alerts (Top Product, Stale Inventory) */}
                        {alert.data && alert.category === 'products' && !alert.title.includes('Rising Star') && (
                          <div className="bg-white rounded-lg p-3">
                            <div className="text-xs font-medium text-gray-600 mb-2">
                              {alert.type === 'insight' ? 'Top Product:' : 'Affected Products:'}
                            </div>
                            {Array.isArray(alert.data) ? (
                              alert.data.slice(0, 3).map((product: any, index: number) => (
                                <div key={index} className="flex justify-between text-xs">
                                  <span>{product.name}</span>
                                  <span>{product.revenue?.toFixed(2)} MAD</span>
                                </div>
                              ))
                            ) : (
                              <div className="flex justify-between text-xs">
                                <span>{alert.data.name}</span>
                                <span>{alert.data.revenue?.toFixed(2)} MAD</span>
                              </div>
                            )}
                          </div>
                        )}

                        {alert.data && alert.category === 'operations' && (
                          <div className="bg-white rounded-lg p-3">
                            <div className="text-xs font-medium text-gray-600 mb-2">
                              Seasonal Products:
                            </div>
                            {Array.isArray(alert.data) && alert.data.slice(0, 3).map((product: any, index: number) => (
                              <div key={index} className="flex justify-between text-xs">
                                <span>{product[0]}</span>
                                <span>{product[1]?.toFixed(2)} MAD (historical)</span>
                              </div>
                            ))}
                          </div>
                        )}


                        {/* Action items */}
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-gray-600">Recommended Actions:</div>
                          <ul className="text-xs space-y-1">
                            {alert.action_items.slice(0, 3).map((action, index) => (
                              <li key={index} className="flex items-start">
                                <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                <span className="text-gray-700">{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="text-xs text-gray-500">
                          {alert.timestamp.toLocaleDateString()} at {alert.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    {!dismissedAlerts.includes(alert.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissAlert(alert.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartAlertsSystem;