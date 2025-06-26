import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Receipt } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PurchaseHistoryProps {
  onBack: () => void;
  userEmail: string;
}

const PurchaseHistory: React.FC<PurchaseHistoryProps> = ({ onBack, userEmail }) => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, [userEmail]);

  const fetchPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_email', userEmail)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = purchases.reduce((sum, purchase) => sum + parseFloat(purchase.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={onBack} variant="outline" size="sm" className="border-green-200 text-green-700">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img 
            src="https://d64gsuwffb70l.cloudfront.net/6848c10115c1e7aea64f3606_1749599147143_6f59f594.jpg" 
            alt="Phytoclinic Logo" 
            className="h-12 w-auto object-contain"
          />
          <h1 className="text-4xl font-bold text-green-700">
            Purchase History
          </h1>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading your purchase history...</div>
        ) : (
          <>
            <Card className="mb-6 border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">${totalSpent.toFixed(2)}</div>
                    <p className="text-sm text-gray-600">Total Spent</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{purchases.length}</div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {purchases.filter(p => p.status === 'paid').length}
                    </div>
                    <p className="text-sm text-gray-600">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Your Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {purchases.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No purchase history found.</p>
                ) : (
                  <div className="space-y-4">
                    {purchases.map((purchase) => (
                      <div key={purchase.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{purchase.invoice_number}</h3>
                            <Badge 
                              variant={purchase.status === 'paid' ? 'default' : 'secondary'}
                              className={purchase.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}
                            >
                              {purchase.status}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-1">{purchase.description}</p>
                          <p className="text-sm text-gray-500">
                            Date: {new Date(purchase.invoice_date).toLocaleDateString()}
                          </p>
                          {purchase.due_date && (
                            <p className="text-sm text-gray-500">
                              Due: {new Date(purchase.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-600">
                            ${parseFloat(purchase.amount).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default PurchaseHistory;