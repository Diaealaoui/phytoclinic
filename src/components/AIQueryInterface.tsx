import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Send, Loader2, MessageSquare, TrendingUp, Users, Package, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Assuming supabase is still needed here for parsing FactureItem

type QueryResult = {
  type: 'chart' | 'table' | 'metric' | 'text';
  title: string;
  data: any;
  interpretation: string;
};

type QueryHistory = {
  id: string;
  question: string;
  result: QueryResult | null;
  timestamp: Date;
  processing: boolean;
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

interface AIQueryInterfaceProps {
  factureData: FactureItemRaw[]; // This will be `filteredFactures` from the parent dashboard
  products: ProductRaw[]; // This will be `products` from the parent dashboard
}

const AIQueryInterface: React.FC<AIQueryInterfaceProps> = ({ factureData, products }) => {
  const [query, setQuery] = useState('');
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Helper function to get category for a product
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


  // Sample suggested queries
  const suggestedQueries = [
    "Show me top 5 customers by revenue",
    "Which products are selling best this month?",
    "Who are my customers at risk of churning? (e.g., 90 days)",
    "What's the revenue trend for fertilizers?",
    "Show me customers who haven't ordered in 60 days",
    "Which product categories are growing fastest?",
    "What is the average order value?",
    "How many unique clients do I have?"
  ];

  // Natural Language Processing function - ENHANCED
  const processNaturalLanguageQuery = async (question: string): Promise<QueryResult> => {
    const lowercaseQuery = question.toLowerCase();

    // Query 1: Top Customers by Revenue
    if ((lowercaseQuery.includes('top') || lowercaseQuery.includes('highest')) && (lowercaseQuery.includes('customer') || lowercaseQuery.includes('client'))) {
        return await processTopCustomersQuery(question);
    }

    // Query 2: Best Selling Products
    if ((lowercaseQuery.includes('product') || lowercaseQuery.includes('item')) && (lowercaseQuery.includes('best') || lowercaseQuery.includes('selling') || lowercaseQuery.includes('top'))) {
        return await processTopProductsQuery(question);
    }

    // Query 3: Customers at Risk of Churning
    if (lowercaseQuery.includes('churn') || (lowercaseQuery.includes('haven\'t') && lowercaseQuery.includes('order'))) {
        return await processChurnRiskQuery(question);
    }

    // Query 4: Revenue Trend (Overall or by Category)
    if (lowercaseQuery.includes('revenue') && (lowercaseQuery.includes('trend') || lowercaseQuery.includes('growth'))) {
        if (lowercaseQuery.includes('category') || lowercaseQuery.includes('product type')) {
            const categoryMatch = lowercaseQuery.match(/for\s+([a-zA-Z\s]+)$/);
            const categoryName = categoryMatch ? categoryMatch[1].trim() : '';
            return await processCategoryRevenueTrendQuery(categoryName);
        }
        return await processOverallRevenueTrendQuery();
    }

    // Query 5: Business Overview / Total Metrics
    if (lowercaseQuery.includes('total revenue') || lowercaseQuery.includes('business overview') || lowercaseQuery.includes('total orders') || lowercaseQuery.includes('unique clients') || lowercaseQuery.includes('average order value')) {
        return await processBusinessOverviewQuery();
    }

    // Query 6: Category Performance
    if ((lowercaseQuery.includes('category') || lowercaseQuery.includes('product category')) && (lowercaseQuery.includes('performance') || lowercaseQuery.includes('top'))) {
        return await processTopCategoryPerformanceQuery();
    }

    // Default response for unrecognized queries
    return {
      type: 'text',
      title: 'Query Not Understood',
      data: null,
      interpretation: "I couldn't understand that query. Try asking about top customers, best selling products, customer churn, revenue trends, or business overview. Be more specific if asking about trends for a category."
    };
  };

  // Query processors - ENHANCED
  const processTopCustomersQuery = async (question: string): Promise<QueryResult> => {
    const numberMatch = question.match(/\d+/);
    const limit = numberMatch ? parseInt(numberMatch[0]) : 5;

    const customerRevenue: { [key: string]: number } = {};
    factureData.forEach(item => {
      const client = item["Client Name"] || 'Unknown';
      const amount = parseNumber(item.Quantity) * parseNumber(item.Price);
      customerRevenue[client] = (customerRevenue[client] || 0) + amount;
    });

    const topCustomers = Object.entries(customerRevenue)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    return {
      type: 'table',
      title: `Top ${limit} Customers by Revenue`,
      data: topCustomers,
      interpretation: `Here are your top ${limit} customers. ${topCustomers[0]?.name} is your highest-value customer with ${topCustomers[0]?.revenue.toFixed(2)} MAD in total revenue.`
    };
  };

  const processTopProductsQuery = async (question: string): Promise<QueryResult> => {
    const numberMatch = question.match(/\d+/);
    const limit = numberMatch ? parseInt(numberMatch[0]) : 5;

    const productSales: { [key: string]: { revenue: number; quantity: number } } = {};
    factureData.forEach(item => {
      const product = item.Product || 'Unknown';
      const amount = parseNumber(item.Quantity) * parseNumber(item.Price);
      const qty = parseNumber(item.Quantity);

      if (!productSales[product]) {
        productSales[product] = { revenue: 0, quantity: 0 };
      }
      productSales[product].revenue += amount;
      productSales[product].quantity += qty;
    });

    const topProducts = Object.entries(productSales)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    return {
      type: 'table',
      title: `Top ${limit} Best Selling Products`,
      data: topProducts,
      interpretation: `Your best-selling product is ${topProducts[0]?.name} with ${topProducts[0]?.revenue.toFixed(2)} MAD in revenue and ${topProducts[0]?.quantity} units sold.`
    };
  };

  const processChurnRiskQuery = async (question: string): Promise<QueryResult> => {
    const now = new Date();
    const daysMatch = question.match(/(\d+)\s*days/);
    const daysThreshold = daysMatch ? parseInt(daysMatch[1]) : 60;

    const customerLastOrder: { [key: string]: Date } = {};
    factureData.forEach(item => {
      const client = item["Client Name"] || 'Unknown';
      const orderDate = parseDate(item.Date);
      if (orderDate && (!customerLastOrder[client] || orderDate > customerLastOrder[client])) {
        customerLastOrder[client] = orderDate;
      }
    });

    const atRiskCustomers = Object.entries(customerLastOrder)
      .map(([name, lastOrder]) => {
        const daysSinceLastOrder = Math.floor((now.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24));
        return { name, lastOrder: lastOrder.toLocaleDateString(), daysSinceLastOrder };
      })
      .filter(customer => customer.daysSinceLastOrder > daysThreshold)
      .sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder);

    return {
      type: 'table',
      title: `Customers at Risk of Churning (Over ${daysThreshold} Days)`,
      data: atRiskCustomers,
      interpretation: `${atRiskCustomers.length} customers haven't ordered in over ${daysThreshold} days. Consider reaching out with retention offers.`
    };
  };

  const processOverallRevenueTrendQuery = async (): Promise<QueryResult> => {
    const monthlyRevenue: { [key: string]: number } = {};
    factureData.forEach(item => {
      const date = parseDate(item.Date);
      if (!date) return;
      const month = date.toISOString().slice(0, 7);
      const amount = parseNumber(item.Quantity) * parseNumber(item.Price);
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + amount;
    });

    const trendData = Object.entries(monthlyRevenue)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      type: 'chart', // Indicates it's chart data, to be rendered textually
      title: 'Overall Monthly Revenue Trend',
      data: trendData,
      interpretation: trendData.length > 1 ?
        `Showing revenue trend across ${trendData.length} months. Latest reported revenue: ${trendData[trendData.length - 1]?.revenue.toFixed(2)} MAD.` :
        'Not enough historical data for a meaningful trend analysis.'
    };
  };

  const processCategoryRevenueTrendQuery = async (categoryName: string): Promise<QueryResult> => {
    const filteredByCategory = factureData.filter(item =>
        getProductCategory(item.Product).toLowerCase().includes(categoryName.toLowerCase())
    );

    if (filteredByCategory.length === 0) {
        return {
            type: 'text',
            title: `No Data for Category: ${categoryName}`,
            data: null,
            interpretation: `Could not find any transactions for the category "${categoryName}". Please check the spelling or try a different category.`
        };
    }

    const monthlyRevenue: { [key: string]: number } = {};
    filteredByCategory.forEach(item => {
        const date = parseDate(item.Date);
        if (!date) return;
        const month = date.toISOString().slice(0, 7);
        const amount = parseNumber(item.Quantity) * parseNumber(item.Price);
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + amount;
    });

    const trendData = Object.entries(monthlyRevenue)
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => a.month.localeCompare(b.month));

    return {
        type: 'chart',
        title: `Monthly Revenue Trend for ${categoryName || 'Selected'} Category`,
        data: trendData,
        interpretation: trendData.length > 1 ?
            `Showing revenue trend for ${categoryName} across ${trendData.length} months. Latest reported revenue: ${trendData[trendData.length - 1]?.revenue.toFixed(2)} MAD.` :
            `Not enough historical data for a meaningful trend analysis for ${categoryName}.`
    };
  };


  const processBusinessOverviewQuery = async (): Promise<QueryResult> => {
    const totalRevenue = factureData.reduce((sum, item) => {
      return sum + (parseNumber(item.Quantity) * parseNumber(item.Price));
    }, 0);

    const totalOrders = factureData.length;
    const uniqueCustomers = new Set(factureData.map(item => item["Client Name"])).size;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate top category (re-using logic from main dashboard)
    const categoryData: { [key: string]: { revenue: number; } } = {};
    factureData.forEach(item => {
      const category = getProductCategory(item.Product);
      categoryData[category] = (categoryData[category] || 0) + (parseNumber(item.Quantity) * parseNumber(item.Price));
    });
    const topCategory = Object.entries(categoryData).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';


    return {
      type: 'metric',
      title: 'Overall Business Overview',
      data: {
        totalRevenue,
        totalOrders,
        uniqueCustomers,
        averageOrderValue: avgOrderValue,
        topCategory
      },
      interpretation: `Your total business revenue is ${totalRevenue.toFixed(2)} MAD across ${totalOrders} orders from ${uniqueCustomers} unique customers. The average order value is ${avgOrderValue.toFixed(2)} MAD. Your top performing category is ${topCategory}.`
    };
  };

  const processTopCategoryPerformanceQuery = async (): Promise<QueryResult> => {
    const categoryData: { [key: string]: { revenue: number; quantity: number; items: number; } } = {};
    factureData.forEach(item => {
      const category = getProductCategory(item.Product);
      const amount = parseNumber(item.Quantity) * parseNumber(item.Price);
      const qty = parseNumber(item.Quantity);

      if (!categoryData[category]) {
        categoryData[category] = { revenue: 0, quantity: 0, items: 0 };
      }
      categoryData[category].revenue += amount;
      categoryData[category].quantity += qty;
      categoryData[category].items += 1;
    });

    const categoryPerformance = Object.entries(categoryData)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // Top 5 categories

    return {
      type: 'table',
      title: 'Top 5 Product Categories by Revenue',
      data: categoryPerformance,
      interpretation: `Here are your top 5 product categories. "${categoryPerformance[0]?.name}" is the leading category with ${categoryPerformance[0]?.revenue.toFixed(2)} MAD.`
    };
  };


  const handleSubmitQuery = async () => {
    if (!query.trim() || isProcessing) return;

    const newQuery: QueryHistory = {
      id: Date.now().toString(),
      question: query,
      result: null,
      timestamp: new Date(),
      processing: true
    };

    setQueryHistory(prev => [newQuery, ...prev]);
    setIsProcessing(true);
    setQuery('');

    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const result = await processNaturalLanguageQuery(newQuery.question);

      setQueryHistory(prev =>
        prev.map(q =>
          q.id === newQuery.id
            ? { ...q, result, processing: false }
            : q
        )
      );
    } catch (error) {
      console.error('Query processing error:', error);
      setQueryHistory(prev =>
        prev.map(q =>
          q.id === newQuery.id
            ? {
                ...q,
                result: {
                  type: 'text',
                  title: 'Error',
                  data: null,
                  interpretation: 'Sorry, there was an error processing your query. Please try again.'
                },
                processing: false
              }
            : q
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const renderQueryResult = (result: QueryResult) => {
    switch (result.type) {
      case 'table':
        return (
          <div className="space-y-3">
            <div className="max-h-64 overflow-y-auto">
              {result.data.length > 0 ? result.data.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">{item.name}</span>
                  <div className="text-right">
                    {item.revenue !== undefined && <div>{item.revenue.toFixed(2)} MAD</div>}
                    {item.quantity !== undefined && <div className="text-xs text-gray-500">{item.quantity} units</div>}
                    {item.daysSinceLastOrder !== undefined && <div className="text-xs text-red-500">{item.daysSinceLastOrder} days ago</div>}
                  </div>
                </div>
              )) : <div className="text-sm text-gray-600">No data found for this query.</div>}
            </div>
          </div>
        );

      case 'metric':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{result.data.totalRevenue?.toFixed(2) || 'N/A'}</div>
              <div className="text-xs text-gray-600">Total Revenue (MAD)</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{result.data.totalOrders || 'N/A'}</div>
              <div className="text-xs text-gray-600">Total Orders</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded">
              <div className="text-2xl font-bold text-purple-600">{result.data.uniqueCustomers || 'N/A'}</div>
              <div className="text-xs text-gray-600">Unique Customers</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded">
              <div className="text-2xl font-bold text-orange-600">{result.data.averageOrderValue?.toFixed(2) || 'N/A'}</div>
              <div className="text-xs text-gray-600">Avg Order Value</div>
            </div>
             {result.data.topCategory && (
              <div className="text-center p-3 bg-red-50 rounded col-span-2">
                <div className="text-lg font-bold text-red-600">{result.data.topCategory}</div>
                <div className="text-xs text-gray-600">Top Performing Category</div>
              </div>
            )}
          </div>
        );

      case 'chart':
        return (
          <div className="space-y-2">
            <p className="text-sm text-gray-700 font-medium mb-2">{result.title}</p>
            {result.data.length > 0 ? result.data.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                <span>{item.month || item.name}</span> {/* Use month for trends, name for others */}
                <span className="font-medium">{item.revenue?.toFixed(2) || 'N/A'} MAD</span>
              </div>
            )) : <div className="text-sm text-gray-600">No chart data found for this query.</div>}
            <p className="text-xs text-gray-600 italic mt-2">{result.interpretation}</p>
          </div>
        );

      default:
        return <div className="text-sm text-gray-600">{result.interpretation}</div>;
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="w-5 h-5 mr-2 text-purple-600" />
          AI Query Interface
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Query Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything about your business data..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmitQuery()}
            disabled={isProcessing}
          />
          <Button onClick={handleSubmitQuery} disabled={isProcessing || !query.trim()}>
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {/* Suggested Queries */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Suggested queries:</div>
          <div className="flex flex-wrap gap-2">
            {suggestedQueries.slice(0, 5).map((suggestion, index) => ( // Show more suggestions
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setQuery(suggestion)}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>

        {/* Query History */}
        <ScrollArea className="h-64">
          <div className="space-y-4">
            {queryHistory.map((queryItem) => (
              <div key={queryItem.id} className="border-l-4 border-purple-200 pl-4 space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-sm">{queryItem.question}</span>
                  {queryItem.processing && <Loader2 className="w-4 h-4 animate-spin text-purple-500" />}
                </div>

                {queryItem.result && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="font-medium text-sm text-gray-800">{queryItem.result.title}</div>
                    {renderQueryResult(queryItem.result)}
                    <div className="text-xs text-gray-600 italic">{queryItem.result.interpretation}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AIQueryInterface;