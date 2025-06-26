import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Link as LinkIcon, Database, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

const DirectZohoSync = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accessToken, setAccessToken] = useState('');
  const [orgId, setOrgId] = useState('20099702576'); // Your org ID
  const [status, setStatus] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const handleDirectSync = async () => {
    if (!accessToken || !orgId) {
      setSyncStatus("⚠️ Please enter access token and org ID");
      return;
    }

    setSyncLoading(true);
    setSyncStatus("🔄 Syncing directly from Zoho...");

    try {
      // Step 1: Fetch invoices directly from Zoho EU API
      const invoicesUrl = `https://www.zohoapis.eu/books/v3/invoices?organization_id=${orgId}&per_page=50`;
      
      console.log('Fetching from:', invoicesUrl);
      
      const response = await fetch(invoicesUrl, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zoho API error: ${response.status} - ${errorText}`);
      }

      const zohoData = await response.json();
      const invoices = zohoData.invoices || [];
      
      console.log(`Found ${invoices.length} invoices`);
      setSyncStatus(`📋 Found ${invoices.length} invoices, processing...`);

      let syncedCount = 0;
      let factureCount = 0;

      // Step 2: Process each invoice (limit to 10 for testing)
      for (const invoice of invoices.slice(0, 10)) {
        try {
          console.log(`Processing: ${invoice.invoice_number}`);
          
          // Get detailed invoice data
          const detailUrl = `https://www.zohoapis.eu/books/v3/invoices/${invoice.invoice_id}?organization_id=${orgId}`;
          
          const detailResponse = await fetch(detailUrl, {
            headers: {
              'Authorization': `Zoho-oauthtoken ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (!detailResponse.ok) {
            console.warn(`Failed to get details for ${invoice.invoice_number}`);
            continue;
          }

          const detailData = await detailResponse.json();
          const invoiceDetail = detailData.invoice;

          // Step 3: Update invoices table
          const { error: invoiceError } = await supabase
            .from('invoices')
            .upsert({
              invoice_number: invoiceDetail.invoice_number,
              amount: parseFloat(invoiceDetail.total) || 0,
              status: invoiceDetail.status?.toLowerCase() || 'unknown',
              invoice_date: invoiceDetail.date,
              due_date: invoiceDetail.due_date,
              customer_name: invoiceDetail.customer_name,
              zoho_invoice_id: invoiceDetail.invoice_id
            });

          if (invoiceError) {
            console.error('Invoice error:', invoiceError);
          }

          // Step 4: Process line items for facture table
          const lineItems = invoiceDetail.line_items || [];
          
          for (const lineItem of lineItems) {
            const { error: factureError } = await supabase
              .from('facture')
              .insert({
                invoice_id: invoiceDetail.invoice_id,
                "Client Name": invoiceDetail.customer_name,
                "Date": invoiceDetail.date,
                "Product": lineItem.name,
                "Quantity": lineItem.quantity?.toString() || "0",
                "Price": lineItem.rate?.toString() || "0"
              });

            if (factureError) {
              console.error('Facture error:', factureError);
            } else {
              factureCount++;
            }
          }

          syncedCount++;
          setSyncStatus(`🔄 Processed ${syncedCount} invoices, ${factureCount} line items...`);
          
          // Small delay to avoid hitting rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (itemError) {
          console.error(`Error processing ${invoice.invoice_number}:`, itemError);
        }
      }

      setSyncStatus(`✅ Sync complete! ${syncedCount} invoices, ${factureCount} line items added to facture table`);
      toast({ 
        title: "Sync Complete", 
        description: `Successfully synced ${syncedCount} invoices with ${factureCount} line items`
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      console.error('Sync error:', err);
      setSyncStatus(`❌ Sync failed: ${message}`);
      toast({ title: "Sync Error", description: message, variant: "destructive" });
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 flex flex-col items-center">
        <div className="w-full max-w-2xl">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="mb-4 bg-white/80"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 text-gray-800">
                <LinkIcon className="w-6 h-6 text-indigo-600"/>
                Direct Zoho Sync (EU)
              </h2>

              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  🚀 Direct Approach:
                </h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Calls Zoho EU API directly from browser</li>
                  <li>• No Edge Functions needed</li>
                  <li>• Real-time sync status</li>
                  <li>• Direct database updates</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="accessToken">Zoho Access Token</Label>
                  <Input 
                    id="accessToken" 
                    type="password"
                    value={accessToken} 
                    onChange={(e) => setAccessToken(e.target.value)} 
                    placeholder="Enter your current Zoho access token" 
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get this from your Zoho Developer Console
                  </p>
                </div>

                <div>
                  <Label htmlFor="orgId">Organization ID</Label>
                  <Input 
                    id="orgId" 
                    value={orgId} 
                    onChange={(e) => setOrgId(e.target.value)} 
                    placeholder="Your Zoho organization ID" 
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="mt-6">
                <Button 
                  onClick={handleDirectSync} 
                  disabled={syncLoading || !accessToken || !orgId} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
                  {syncLoading ? "Syncing..." : "Start Direct Sync"}
                </Button>
              </div>
              
              {syncStatus && (
                <div className={`mt-4 p-3 rounded-lg border flex items-start gap-2 ${
                  syncStatus.includes('✅') ? 'bg-green-50 border-green-200' : 
                  syncStatus.includes('🔄') ? 'bg-blue-50 border-blue-200' : 
                  syncStatus.includes('❌') ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  {syncStatus.includes('✅') ? (
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  ) : syncStatus.includes('🔄') ? (
                    <RefreshCw className="w-4 h-4 text-blue-600 mt-0.5 animate-spin" />
                  ) : syncStatus.includes('❌') ? (
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                  ) : null}
                  <p className={`text-sm font-medium ${
                    syncStatus.includes('✅') ? 'text-green-800' : 
                    syncStatus.includes('🔄') ? 'text-blue-800' : 
                    syncStatus.includes('❌') ? 'text-red-800' : 'text-gray-800'
                  }`}>
                    {syncStatus}
                  </p>
                </div>
              )}

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">
                  📋 How it works:
                </h3>
                <ol className="text-sm text-gray-700 space-y-1">
                  <li>1. Fetches invoices from Zoho EU API</li>
                  <li>2. Gets detailed line items for each invoice</li>
                  <li>3. Updates invoices table directly</li>
                  <li>4. Populates facture table with product details</li>
                  <li>5. Shows real-time progress</li>
                </ol>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  ⚠️ Note:
                </h3>
                <p className="text-sm text-yellow-700">
                  You'll need a fresh access token from Zoho. Access tokens typically expire after 1 hour.
                </p>
              </div>
            </div>
        </div>
    </div>
  );
};

export default DirectZohoSync;