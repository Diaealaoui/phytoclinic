import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, ArrowLeft, Receipt } from 'lucide-react';

const PurchaseHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState('');
  const [productCategories, setProductCategories] = useState<any>({});
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) return setLoading(false);
        const { data: userProfile } = await supabase.from('users').select('name').eq('email', user.email).single();
        if (!userProfile?.name) return setLoading(false);
        setCurrentUserName(userProfile.name);

        const { data: factureData } = await supabase.from('facture').select('*').eq('Client Name', userProfile.name);
        if (!factureData || factureData.length === 0) return setLoading(false);

        const { data: productsData } = await supabase.from('products').select('"Item Name", "CF.Category"');
        const categories: any = {};
        productsData?.forEach((product: any) => {
          categories[product["Item Name"]] = product["CF.Category"] || 'Uncategorized';
        });
        setProductCategories(categories);

        const invoiceGroups: any = {};
        factureData.forEach((item: any) => {
          const invoiceId = item.invoice_id || 'no-invoice';
          if (!invoiceGroups[invoiceId]) {
            invoiceGroups[invoiceId] = {
              id: invoiceId,
              invoice_number: invoiceId,
              client_name: item['Client Name'],
              date: item.Date,
              total: 0,
              items: []
            };
          }
          const category = categories[item.Product] || 'Uncategorized';
          const itemTotal = (item.Quantity || 0) * (item.Price || 0);
          invoiceGroups[invoiceId].items.push({ ...item, category, total: itemTotal });
          invoiceGroups[invoiceId].total += itemTotal;
        });

        const finalHistory = Object.values(invoiceGroups);
        setHistory(finalHistory);
        setFilteredHistory(finalHistory);

        const uniqueCategories = [...new Set(finalHistory.flatMap(inv => inv.items.map(i => i.category)))].filter(Boolean).sort();
        setAllCategories(uniqueCategories);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    let filtered = [...history];
    if (dateFilter) filtered = filtered.filter(inv => new Date(inv.date).toISOString().split('T')[0] === dateFilter);
    const processed = filtered.map(inv => {
      let items = [...inv.items];
      if (productFilter) items = items.filter(i => i.Product?.toLowerCase().includes(productFilter.toLowerCase()));
      if (categoryFilter) items = items.filter(i => i.category === categoryFilter);
      if (!items.length) return null;
      const total = items.reduce((sum, i) => sum + i.total, 0);
      return { ...inv, items, total };
    }).filter(Boolean);
    setFilteredHistory(processed);
  }, [history, dateFilter, productFilter, categoryFilter]);

  const totalSpent = filteredHistory.reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigate('/dashboard')}><ArrowLeft className="mr-2" /> Back</Button>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-800">Purchase History</h1>
            {currentUserName && <p className="text-sm text-gray-600">Welcome, {currentUserName}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded-lg shadow">
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} placeholder="Filter by date" className="border p-2 rounded w-full text-sm" />
          <input type="text" value={productFilter} onChange={e => setProductFilter(e.target.value)} placeholder="Search product name" className="border p-2 rounded w-full text-sm" />
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border p-2 rounded w-full text-sm">
            <option value="">All Categories</option>
            {allCategories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-green-700">Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-gray-500 text-sm">Total Spent</p>
              <p className="text-2xl font-bold text-green-800">{totalSpent.toFixed(2)} MAD</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-sm">Invoices</p>
              <p className="text-2xl font-bold text-blue-700">{filteredHistory.length}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-sm">Total Items</p>
              <p className="text-2xl font-bold text-purple-700">{filteredHistory.reduce((s, i) => s + i.items.length, 0)}</p>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-10">
            <Loader2 className="animate-spin w-6 h-6 mx-auto text-gray-500" />
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <p className="text-center text-gray-500">No purchase history found.</p>
        ) : (
          <div className="space-y-6">
            {filteredHistory.map(inv => (
              <Card key={inv.id} className="bg-white shadow hover:shadow-md">
                <CardHeader className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-gray-700 text-base sm:text-lg">Invoice #{inv.invoice_number}</CardTitle>
                    <p className="text-sm text-gray-500">{new Date(inv.date).toLocaleDateString()}</p>
                  </div>
                  <p className="text-green-700 font-bold text-lg">{inv.total.toFixed(2)} MAD</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {inv.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.Product}</p>
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Qty: {item.Quantity} × {item.Price} MAD</p>
                        <p className="font-semibold text-sm">{item.total.toFixed(2)} MAD</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseHistoryPage;
