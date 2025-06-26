import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Search, Download, ExternalLink, Calendar, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface Catalogue {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: string;
  users?: {
    name: string;
  };
}

interface CatalogueViewerProps {
  userType?: 'admin' | 'client';
}

const CatalogueViewer: React.FC<CatalogueViewerProps> = ({ userType = 'client' }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [filteredCatalogues, setFilteredCatalogues] = useState<Catalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatalogue, setSelectedCatalogue] = useState<Catalogue | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    fetchCatalogues();
  }, []);

  useEffect(() => {
    // Filter catalogues based on search term
    const filtered = catalogues.filter(catalogue =>
      catalogue.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCatalogues(filtered);
  }, [catalogues, searchTerm]);

  const fetchCatalogues = async () => {
    try {
      console.log('📊 Fetching catalogues for viewer...');
      setDebugInfo('Loading catalogues...');
      
      // ✅ FIXED: Simplified query without the users join first
      const { data, error } = await supabase
        .from('product_catalogues')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching catalogues:', error);
        setDebugInfo(`❌ Database error: ${error.message}`);
        
        // Provide specific error messages
        if (error.code === '42P01') {
          toast({
            title: "Database Setup Required",
            description: "The product_catalogues table doesn't exist. Please run the SQL setup first.",
            variant: "destructive"
          });
          setDebugInfo('❌ Table "product_catalogues" not found. Please run SQL setup.');
        } else if (error.code === '42501') {
          toast({
            title: "Permission Error",
            description: "No permission to read catalogues. Please check RLS policies.",
            variant: "destructive"
          });
          setDebugInfo('❌ Permission denied. Check RLS policies.');
        } else {
          toast({
            title: "Error",
            description: "Failed to load product catalogues: " + error.message,
            variant: "destructive"
          });
          setDebugInfo(`❌ Error: ${error.message}`);
        }
        return;
      }
      
      console.log('✅ Catalogues loaded:', data?.length || 0);
      setDebugInfo(`✅ Loaded ${data?.length || 0} catalogues`);
      setCatalogues(data || []);
      
    } catch (error: any) {
      console.error('❌ Fetch error:', error);
      setDebugInfo(`❌ Fetch failed: ${error.message}`);
      toast({
        title: "Error",
        description: "Failed to load product catalogues",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewCatalogue = async (catalogue: Catalogue) => {
    setPdfLoading(true);
    setSelectedCatalogue(catalogue);
    
    // Add a small delay to show loading state
    setTimeout(() => {
      setPdfLoading(false);
    }, 500);
  };

  const handleDownload = async (catalogue: Catalogue) => {
    try {
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = catalogue.file_url;
      link.download = `${catalogue.title}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Started",
        description: `Downloading ${catalogue.title}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Could not download the catalogue",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // ✅ ADDED: Quick debug test function
  const testDatabase = async () => {
    try {
      console.log('🧪 Testing database connection...');
      setDebugInfo('Testing database...');
      
      // Test basic connection
      const { data: testData, error: testError } = await supabase
        .from('product_catalogues')
        .select('count(*)')
        .limit(1);
      
      console.log('🧪 Test result:', testData, testError);
      
      if (testError) {
        setDebugInfo(`❌ Database test failed: ${testError.message}`);
      } else {
        setDebugInfo(`✅ Database connection OK`);
        // Retry fetching
        await fetchCatalogues();
      }
      
    } catch (error: any) {
      console.error('🧪 Test failed:', error);
      setDebugInfo(`❌ Test failed: ${error.message}`);
    }
  };

  if (selectedCatalogue) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50">
        {/* PDF Viewer Header */}
        <div className="bg-white shadow-lg border-b p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setSelectedCatalogue(null)}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Catalogues
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{selectedCatalogue.title}</h1>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedCatalogue.file_size)} • {formatDate(selectedCatalogue.uploaded_at)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleDownload(selectedCatalogue)}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={() => window.open(selectedCatalogue.file_url, '_blank')}
                variant="outline"
                size="sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 p-4">
          <div className="container mx-auto">
            {pdfLoading ? (
              <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">Loading PDF...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <iframe
                  src={selectedCatalogue.file_url}
                  className="w-full h-[calc(100vh-200px)]"
                  title={selectedCatalogue.title}
                  style={{ border: 'none' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="bg-white/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          {userType === 'admin' && (
            <Button
              onClick={() => navigate('/catalogue-upload')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Manage Catalogues
            </Button>
          )}
        </div>

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-700 mb-2">Product Catalogues</h1>
          <p className="text-gray-600 text-lg">Browse our complete product collection</p>
        </div>

        {/* Search */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search catalogues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Catalogues Grid */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading catalogues...</p>
          </div>
        ) : filteredCatalogues.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm text-center py-12">
            <CardContent>
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchTerm ? 'No catalogues found' : 'No catalogues available'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Product catalogues will appear here when uploaded'
                }
              </p>
              {userType === 'admin' && !searchTerm && (
                <Button
                  onClick={() => navigate('/catalogue-upload')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Upload First Catalogue
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCatalogues.map((catalogue) => (
              <Card key={catalogue.id} className="bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {catalogue.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {formatDate(catalogue.uploaded_at)}
                      </div>
                    </div>
                    <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">File Size:</span>
                      <Badge variant="secondary">{formatFileSize(catalogue.file_size)}</Badge>
                    </div>

                    <div className="flex gap-2 pt-3">
                      <Button
                        onClick={() => handleViewCatalogue(catalogue)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        onClick={() => handleDownload(catalogue)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <Card className="mt-8 bg-gradient-to-r from-green-100 to-teal-100 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold text-green-900 mb-2">📄 Product Catalogues</h3>
              <p className="text-sm text-green-800">
                Browse through our comprehensive product catalogues to find detailed information about our agricultural solutions. 
                All catalogues are available for viewing and download.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CatalogueViewer;