// src/pages/SyncManagerPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  RefreshCw, 
  Database, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const SyncManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState({
    invoices: 0,
    products: 0,
    clients: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkLastSync();
    loadSyncStats();
  }, []);

  const checkLastSync = async () => {
    try {
      // Get the most recent product entry to determine last sync
      const { data, error } = await supabase
        .from('products')
        .select('Date')
        .order('Date', { ascending: false })
        .limit(1);
      
      if (!error && data && data.length > 0) {
        setLastSync(data[0].Date);
      }
    } catch (error) {
      console.error('Error checking last sync:', error);
    }
  };

  const loadSyncStats = async () => {
    try {
      const [factureRes, invoicesRes, productsRes] = await Promise.all([
        supabase.from('facture').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true })
      ]);

      // Get unique clients count from products table (since it has Client Name)
      const { data: clientsData } = await supabase
        .from('products')
        .select('Client Name');
      
      const uniqueClients = new Set(clientsData?.map(prod => prod['Client Name'])).size;

      setSyncStats({
        invoices: factureRes.count || 0, // Show facture count as "invoices"
        products: productsRes.count || 0,
        clients: uniqueClients || 0
      });

      // Log both table counts for debugging
      console.log('Facture table count:', factureRes.count);
      console.log('Invoices table count:', invoicesRes.count);
    } catch (error) {
      console.error('Error loading sync stats:', error);
    }
  };

  const handleFullSync = async () => {
    setSyncStatus('syncing');
    setSyncMessage('Starting full synchronization...');
    setLoading(true);

    try {
      setSyncMessage('Getting Zoho credentials...');
      
      // Get credentials directly from the database table
      const { data: credentials, error: credError } = await supabase
        .from('zoho_credentials')
        .select('org_id')
        .limit(1)
        .single();

      if (credError || !credentials?.org_id) {
        throw new Error('Zoho credentials not found. Please configure Zoho integration first.');
      }

      setSyncMessage('Syncing invoices from Zoho Books to facture table...');
      
      // Get the current user's session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated. Please log in again.');
      }

      // Call your existing sync function - exactly like your Zoho page
      const response = await fetch('https://hjaqnjjptipnxeonojip.supabase.co/functions/v1/sync-invoices-with-categories', { // Corrected URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          action: 'sync_invoices', // <--- ADD THIS LINE
          org_id: credentials.org_id 
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Sync failed');
      }

      // Check if the result has both counts (new function) or just count (old function)
      const invoiceCount = result.count || 0; // This might be 0 now if 'invoices' table is not synced
      const factureCount = result.factureCount || 0;
      
      if (factureCount > 0) {
        setSyncMessage(`✅ Successfully synced ${factureCount} line items!`); // Updated message
      } else {
        setSyncMessage(`✅ Successfully synced ${invoiceCount} records!`); // Fallback, though factureCount is expected
      }
      setSyncStatus('success');
      
      // Refresh our stats
      await loadSyncStats();
      await checkLastSync();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setSyncMessage(`❌ Sync failed: ${errorMessage}`);
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRefresh = async () => {
    setLoading(true);
    setSyncMessage('Refreshing local data...');
    
    try {
      await loadSyncStats();
      await checkLastSync();
      setSyncMessage('✅ Data refreshed successfully');
      setTimeout(() => setSyncMessage(''), 3000);
    } catch (error) {
      setSyncMessage('❌ Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Database className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'border-blue-200 bg-blue-50';
      case 'success': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="bg-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            Sync Manager
          </h1>
        </div>

        {/* Status Card */}
        <Card className={`mb-6 border-2 ${getStatusColor()}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {getStatusIcon()}
              Synchronization Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Last Sync:</p>
                <p className="font-semibold">
                  {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Status:</p>
                <Badge variant={syncStatus === 'success' ? 'default' : 'secondary'}>
                  {syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1)}
                </Badge>
              </div>
            </div>
            {syncMessage && (
              <Alert className="mt-4">
                <AlertDescription>{syncMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-blue-600" />
              <div className="text-2xl font-bold text-gray-800">{syncStats.invoices}</div>
              <p className="text-sm text-gray-600">Total Factures</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Zap className="w-8 h-8 mx-auto mb-3 text-green-600" />
              <div className="text-2xl font-bold text-gray-800">{syncStats.products}</div>
              <p className="text-sm text-gray-600">Products Synced</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Clock className="w-8 h-8 mx-auto mb-3 text-purple-600" />
              <div className="text-2xl font-bold text-gray-800">{syncStats.clients}</div>
              <p className="text-sm text-gray-600">Unique Clients</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Sync */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <RefreshCw className="w-6 h-6 text-blue-600" />
                Full Synchronization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Sync all factures and products from Zoho Books. This may take a few minutes.
              </p>
              <Button 
                onClick={handleFullSync} 
                disabled={loading || syncStatus === 'syncing'}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading && syncStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Start Full Sync
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Refresh */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-green-600" />
                Quick Refresh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Refresh local statistics and check the current data status without syncing.
              </p>
              <Button 
                onClick={handleQuickRefresh} 
                disabled={loading}
                variant="outline"
                className="w-full border-green-200 text-green-700 hover:bg-green-50"
              >
                {loading && syncStatus !== 'syncing' ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Alert */}
        <Alert className="mt-6 bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Note:</strong> Make sure you have saved your Zoho Books credentials in the{' '}
            <button 
              onClick={() => navigate('/zoho')} 
              className="underline font-semibold hover:text-amber-900"
            >
              Zoho Integration page
            </button>
            {' '}before running a full sync. The sync will use your saved credentials automatically.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default SyncManagerPage;