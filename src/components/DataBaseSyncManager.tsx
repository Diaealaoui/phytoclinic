import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Database, 
    RefreshCw, 
    CheckCircle, 
    AlertCircle, 
    Play, 
    Settings,
    Monitor,
    Zap,
    Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const DatabaseSyncManager: React.FC = () => {
    const [syncStatus, setSyncStatus] = useState<{
        isRunning: boolean;
        lastSync: string | null;
        recordCount: number;
        triggerStatus: string;
    }>({
        isRunning: false,
        lastSync: null,
        recordCount: 0,
        triggerStatus: 'unknown'
    });
    
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Helper function to properly format errors
    const formatError = (error: any): string => {
        if (typeof error === 'string') return error;
        if (error?.message) return error.message;
        if (error?.error) return error.error;
        if (error?.details) return error.details;
        return JSON.stringify(error, null, 2);
    };

    // Check trigger status and record counts
    const checkSyncStatus = async () => {
        try {
            addLog('🔍 Checking sync status...');
            
            // Count records in invoice_products
            const { count, error: countError } = await supabase
                .from('invoice_products')
                .select('*', { count: 'exact', head: true });

            if (countError) {
                addLog(`⚠️ Could not count invoice_products: ${formatError(countError)}`);
            }

            // Check if invoice_products table exists and has data
            const { data: sampleData, error: sampleError } = await supabase
                .from('invoice_products')
                .select('*')
                .limit(1);

            // Get recent activity (if sync_log table exists)
            const { data: recentSync, error: syncError } = await supabase
                .from('sync_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1);

            setSyncStatus({
                isRunning: false,
                lastSync: recentSync?.[0]?.created_at || null,
                recordCount: count || 0,
                triggerStatus: sampleError ? 'error' : 'unknown'
            });

            addLog(`✅ Status check complete. Found ${count || 0} product records.`);

        } catch (error) {
            const errorMsg = formatError(error);
            console.error('Error checking sync status:', error);
            addLog(`❌ Error checking status: ${errorMsg}`);
        }
    };

    // Check and fix table structure
    const checkTableStructure = async () => {
        try {
            addLog('🔍 Checking table structure...');
            
            // Get table info
            const { data: columns, error: columnsError } = await supabase
                .rpc('get_table_structure', { table_name: 'invoice_products' });

            if (columnsError) {
                addLog('⚠️ Could not check table structure via RPC, using manual method');
                
                // Try to get a sample record to understand structure
                const { data: sample, error: sampleError } = await supabase
                    .from('invoice_products')
                    .select('*')
                    .limit(1);

                if (sampleError) {
                    addLog(`❌ Error checking table: ${formatError(sampleError)}`);
                    return;
                }

                if (sample && sample.length > 0) {
                    addLog('📋 Current table columns:');
                    Object.keys(sample[0]).forEach(key => {
                        addLog(`  - ${key}: ${typeof sample[0][key]}`);
                    });
                }
            }

            // Check for unique constraint
            addLog('🔍 Checking for unique constraints...');
            const { data: constraints, error: constraintError } = await supabase
                .rpc('check_table_constraints', { table_name: 'invoice_products' });

            if (constraintError) {
                addLog('⚠️ Could not check constraints - this is normal');
                addLog('💡 If you want to add the unique constraint, run this SQL:');
                addLog('ALTER TABLE invoice_products ADD CONSTRAINT unique_invoice_product UNIQUE(invoice_id, product_name);');
            }

        } catch (error) {
            addLog(`❌ Error checking table structure: ${formatError(error)}`);
        }
    };

    // Sync only today's invoices
    const syncTodaysInvoices = async () => {
        setLoading(true);
        setSyncStatus(prev => ({ ...prev, isRunning: true }));
        addLog('🗓️ Syncing today\'s invoices...');

        try {
            // Get today's date
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

            addLog(`📅 Looking for invoices from ${todayStr}`);

            // Get today's invoices
            const { data: todaysInvoices, error: invoicesError } = await supabase
                .from('invoices')
                .select('invoice_number, client_name, amount, description, invoice_date, created_at')
                .gte('invoice_date', todayStr)
                .lt('invoice_date', `${todayStr}T23:59:59`);

            if (invoicesError) {
                throw new Error(`Failed to fetch today's invoices: ${formatError(invoicesError)}`);
            }

            if (!todaysInvoices || todaysInvoices.length === 0) {
                addLog('📭 No invoices found for today');
                return;
            }

            addLog(`📦 Found ${todaysInvoices.length} invoices from today`);

            let successCount = 0;
            let errorCount = 0;
            let skippedCount = 0;

            for (const invoice of todaysInvoices) {
                if (!invoice.invoice_number) continue;

                try {
                    // Check if products already exist
                    const { data: existingProducts, error: checkError } = await supabase
                        .from('invoice_products')
                        .select('id')
                        .eq('invoice_id', invoice.invoice_number)
                        .limit(1);

                    if (checkError) {
                        addLog(`⚠️ Error checking ${invoice.invoice_number}: ${formatError(checkError)}`);
                        errorCount++;
                        continue;
                    }

                    if (existingProducts && existingProducts.length > 0) {
                        skippedCount++;
                        continue;
                    }

                    // Create product record
                    const productData = {
                        invoice_id: invoice.invoice_number,
                        product_name: invoice.description || `Product for ${invoice.invoice_number}`,
                        product_category: 'General',
                        quantity: 1,
                        unit_price: invoice.amount || 0,
                        total_amount: invoice.amount || 0,
                        created_at: invoice.created_at || new Date().toISOString()
                    };

                    const { error: insertError } = await supabase
                        .from('invoice_products')
                        .insert(productData);

                    if (insertError) {
                        if (insertError.code === '23505') {
                            skippedCount++;
                        } else {
                            addLog(`⚠️ Error with ${invoice.invoice_number}: ${formatError(insertError)}`);
                            errorCount++;
                        }
                    } else {
                        successCount++;
                    }
                } catch (error) {
                    addLog(`❌ Failed ${invoice.invoice_number}: ${formatError(error)}`);
                    errorCount++;
                }
            }

            addLog(`✅ Today's sync completed: ${successCount} created, ${skippedCount} skipped, ${errorCount} errors`);

            // Log the sync
            try {
                await supabase.from('sync_log').insert({
                    sync_type: 'today',
                    records_processed: successCount,
                    status: errorCount > 0 ? 'partial_success' : 'success',
                    error_message: errorCount > 0 ? `${errorCount} errors occurred` : null
                });
            } catch (logError) {
                addLog('⚠️ Could not log sync');
            }

            checkSyncStatus();

        } catch (error) {
            const errorMsg = formatError(error);
            addLog(`❌ Today's sync failed: ${errorMsg}`);
        } finally {
            setLoading(false);
            setSyncStatus(prev => ({ ...prev, isRunning: false }));
        }
    };

    // Run manual sync - simplified version that works with existing data
    const runManualSync = async () => {
        setLoading(true);
        setSyncStatus(prev => ({ ...prev, isRunning: true }));
        addLog('🚀 Starting manual sync...');

        try {
            // Step 1: Check if invoice_products table exists
            const { data: tableCheck, error: tableError } = await supabase
                .from('invoice_products')
                .select('*')
                .limit(1);

            if (tableError && tableError.code === 'PGRST116') {
                addLog('❌ invoice_products table does not exist!');
                addLog('📋 Please create the table first using the SQL script.');
                return;
            }

            // Step 2: Get invoices data
            addLog('📊 Fetching invoices data...');
            const { data: invoices, error: invoicesError } = await supabase
                .from('invoices')
                .select('invoice_number, client_name, amount, description, invoice_date, created_at')
                .limit(100); // Start with first 100 for testing

            if (invoicesError) {
                throw new Error(`Failed to fetch invoices: ${formatError(invoicesError)}`);
            }

            if (!invoices || invoices.length === 0) {
                addLog('⚠️ No invoices found in the database');
                return;
            }

            addLog(`📦 Found ${invoices.length} invoices to process`);

            // Step 3: Process each invoice
            let successCount = 0;
            let errorCount = 0;

            for (const invoice of invoices) {
                if (!invoice.invoice_number) continue;

                try {
                    // First, check if this invoice already has products
                    const { data: existingProducts, error: checkError } = await supabase
                        .from('invoice_products')
                        .select('id')
                        .eq('invoice_id', invoice.invoice_number)
                        .limit(1);

                    if (checkError) {
                        addLog(`⚠️ Error checking existing products for ${invoice.invoice_number}: ${formatError(checkError)}`);
                        errorCount++;
                        continue;
                    }

                    // Skip if products already exist for this invoice
                    if (existingProducts && existingProducts.length > 0) {
                        addLog(`⏭️ Skipping ${invoice.invoice_number} - products already exist`);
                        continue;
                    }

                    // Create a simple product record from invoice
                    const productData = {
                        invoice_id: invoice.invoice_number,
                        product_name: invoice.description || 'Invoice Product',
                        product_category: 'General',
                        quantity: 1,
                        unit_price: invoice.amount || 0,
                        total_amount: invoice.amount || 0,
                        created_at: invoice.created_at || new Date().toISOString()
                    };

                    // Use simple insert instead of upsert to avoid constraint issues
                    const { error: insertError } = await supabase
                        .from('invoice_products')
                        .insert(productData);

                    if (insertError) {
                        // If it's a duplicate error, that's okay - just skip
                        if (insertError.code === '23505') {
                            addLog(`⏭️ Skipping duplicate: ${invoice.invoice_number}`);
                        } else {
                            addLog(`⚠️ Error processing invoice ${invoice.invoice_number}: ${formatError(insertError)}`);
                            errorCount++;
                        }
                    } else {
                        successCount++;
                        if (successCount % 10 === 0) {
                            addLog(`📈 Progress: ${successCount} invoices processed`);
                        }
                    }
                } catch (error) {
                    addLog(`❌ Failed to process invoice ${invoice.invoice_number}: ${formatError(error)}`);
                    errorCount++;
                }
            }

            addLog(`✅ Manual sync completed: ${successCount} success, ${errorCount} errors`);

            // Try to log the sync (if table exists)
            try {
                await supabase.from('sync_log').insert({
                    sync_type: 'manual',
                    records_processed: successCount,
                    status: errorCount > 0 ? 'partial_success' : 'success',
                    error_message: errorCount > 0 ? `${errorCount} errors occurred` : null
                });
            } catch (logError) {
                addLog('⚠️ Could not log sync (sync_log table may not exist)');
            }

            checkSyncStatus();

        } catch (error) {
            const errorMsg = formatError(error);
            console.error('Manual sync failed:', error);
            addLog(`❌ Manual sync failed: ${errorMsg}`);
            
            try {
                await supabase.from('sync_log').insert({
                    sync_type: 'manual',
                    status: 'failed',
                    error_message: errorMsg
                });
            } catch (logError) {
                // Ignore logging errors
            }
        } finally {
            setLoading(false);
            setSyncStatus(prev => ({ ...prev, isRunning: false }));
        }
    };

    // Setup database triggers - provide SQL instructions
    const setupTriggers = async () => {
        setLoading(true);
        addLog('⚙️ Setting up database triggers...');

        try {
            // Try to call the setup function
            const { data, error } = await supabase.rpc('setup_sync_triggers');

            if (error) {
                addLog('❌ RPC function not found. Please run the SQL script manually.');
                addLog('📋 SQL script needed:');
                addLog(`
-- Copy this SQL and run it in Supabase SQL Editor:

-- 1. Create the sync function
CREATE OR REPLACE FUNCTION sync_invoice_products()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO invoice_products (
            invoice_id, product_name, product_category, 
            quantity, unit_price, total_amount, created_at
        ) VALUES (
            NEW.invoice_number,
            COALESCE(NEW.description, 'Invoice Product'),
            'General',
            1,
            COALESCE(NEW.amount, 0),
            COALESCE(NEW.amount, 0),
            COALESCE(NEW.created_at, NOW())
        )
        ON CONFLICT (invoice_id, product_name) 
        DO UPDATE SET
            total_amount = EXCLUDED.total_amount,
            unit_price = EXCLUDED.unit_price,
            updated_at = NOW();
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        DELETE FROM invoice_products WHERE invoice_id = OLD.invoice_number;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the triggers
CREATE TRIGGER trigger_sync_invoice_products_insert
    AFTER INSERT ON invoices FOR EACH ROW
    EXECUTE FUNCTION sync_invoice_products();

CREATE TRIGGER trigger_sync_invoice_products_update
    AFTER UPDATE ON invoices FOR EACH ROW
    EXECUTE FUNCTION sync_invoice_products();

CREATE TRIGGER trigger_sync_invoice_products_delete
    AFTER DELETE ON invoices FOR EACH ROW
    EXECUTE FUNCTION sync_invoice_products();
                `);
                return;
            }

            addLog('✅ Database triggers setup successfully!');
            checkSyncStatus();

        } catch (error) {
            const errorMsg = formatError(error);
            console.error('Trigger setup failed:', error);
            addLog(`❌ Trigger setup failed: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    // Test trigger functionality
    const testTriggers = async () => {
        setLoading(true);
        addLog('🧪 Testing trigger functionality...');

        try {
            // Insert a test invoice to see if triggers work
            const testInvoiceNumber = `TEST-${Date.now()}`;
            
            addLog(`📝 Creating test invoice: ${testInvoiceNumber}`);
            
            const { error: insertError } = await supabase
                .from('invoices')
                .insert({
                    invoice_number: testInvoiceNumber,
                    client_name: 'Test Client',
                    amount: 99.99,
                    description: 'Test Product for Trigger',
                    invoice_date: new Date().toISOString(),
                    created_at: new Date().toISOString()
                });

            if (insertError) {
                throw new Error(`Failed to create test invoice: ${formatError(insertError)}`);
            }

            // Wait a moment for trigger to execute
            addLog('⏳ Waiting for triggers to execute...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check if invoice_products was created
            const { data: products, error: selectError } = await supabase
                .from('invoice_products')
                .select('*')
                .eq('invoice_id', testInvoiceNumber);

            if (selectError) {
                throw new Error(`Failed to check products: ${formatError(selectError)}`);
            }

            if (products && products.length > 0) {
                addLog(`✅ Triggers working! Created ${products.length} product records`);
                addLog(`📦 Product created: ${products[0].product_name}`);
            } else {
                addLog('⚠️ Triggers may not be working - no products created automatically');
                addLog('💡 Try running the SQL script to set up triggers');
            }

            // Clean up test data
            addLog('🧹 Cleaning up test data...');
            await supabase.from('invoices').delete().eq('invoice_number', testInvoiceNumber);
            await supabase.from('invoice_products').delete().eq('invoice_id', testInvoiceNumber);

            checkSyncStatus();

        } catch (error) {
            const errorMsg = formatError(error);
            console.error('Trigger test failed:', error);
            addLog(`❌ Trigger test failed: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 29)]); // Keep last 30 logs
    };

    useEffect(() => {
        checkSyncStatus();
        addLog('🚀 Database Sync Manager initialized');
    }, []);

    return (
        <div className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            Sync Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge 
                            variant={syncStatus.isRunning ? "default" : "secondary"}
                            className={syncStatus.isRunning ? "bg-green-500" : ""}
                        >
                            {syncStatus.isRunning ? "Running" : "Idle"}
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Trigger Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge 
                            variant={syncStatus.triggerStatus === 'active' ? "default" : "destructive"}
                            className={syncStatus.triggerStatus === 'active' ? "bg-green-500" : ""}
                        >
                            {syncStatus.triggerStatus === 'active' ? "Active" : "Unknown"}
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Product Records
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {syncStatus.recordCount.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-gray-600">
                            {syncStatus.lastSync 
                                ? new Date(syncStatus.lastSync).toLocaleString()
                                : 'Never'
                            }
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Sync Controls
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Button 
                            onClick={checkTableStructure}
                            disabled={loading}
                            variant="outline"
                            className="text-purple-700 border-purple-200"
                        >
                            <Database className="w-4 h-4 mr-2" />
                            Check Table
                        </Button>

                        <Button 
                            onClick={syncTodaysInvoices}
                            disabled={loading || syncStatus.isRunning}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            {loading ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Calendar className="w-4 h-4 mr-2" />
                            )}
                            {loading ? "Syncing..." : "Sync Today"}
                        </Button>

                        <Button 
                            onClick={setupTriggers}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            {loading ? "Setting up..." : "Setup Triggers"}
                        </Button>

                        <Button 
                            onClick={testTriggers}
                            disabled={loading}
                            variant="outline"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {loading ? "Testing..." : "Test Triggers"}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button 
                            onClick={runManualSync}
                            disabled={loading || syncStatus.isRunning}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {loading ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Play className="w-4 h-4 mr-2" />
                            )}
                            {loading ? "Syncing..." : "Full Manual Sync"}
                        </Button>

                        <Button 
                            onClick={checkSyncStatus}
                            disabled={loading}
                            variant="outline"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh Status
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Activity Log */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Activity Log
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
                        {logs.length === 0 ? (
                            <div className="text-gray-500 text-center py-8">
                                No activity yet. Click a button to start.
                            </div>
                        ) : (
                            logs.map((log, index) => (
                                <div key={index} className="mb-1 whitespace-pre-wrap">
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Quick Setup Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Setup Guide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">Step 1: Create Tables</h4>
                        <p className="text-sm text-blue-700">
                            If invoice_products table doesn't exist, run the SQL script from the documentation.
                        </p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-2">Step 2: Manual Sync</h4>
                        <p className="text-sm text-green-700">
                            Click "Run Manual Sync" to populate invoice_products from existing invoices.
                        </p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-purple-800 mb-2">Step 3: Setup Triggers</h4>
                        <p className="text-sm text-purple-700">
                            Click "Setup Triggers" for automatic syncing. Check logs for SQL script if needed.
                        </p>
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-orange-800 mb-2">Step 4: Test</h4>
                        <p className="text-sm text-orange-700">
                            Use "Test Triggers" to verify everything works correctly.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DatabaseSyncManager;