import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, AlertCircle, ArrowLeft, X, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface UploadedCatalogue {
  id: string;
  title: string;
  file_url: string;
  uploaded_at: string;
  file_size: number;
}

const CatalogueUploader: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [catalogues, setCatalogues] = useState<UploadedCatalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Fetch existing catalogues on component mount
  React.useEffect(() => {
    fetchCatalogues();
    checkStorageSetup();
  }, []);

  const checkStorageSetup = async () => {
    try {
      console.log('🔍 Checking storage setup...');
      setDebugInfo('Checking storage configuration...');
      
      // Try to list buckets to see if catalogues bucket exists
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('❌ Error listing buckets:', bucketsError);
        setDebugInfo(`❌ Storage error: ${bucketsError.message}`);
        return;
      }
      
      const cataloguesBucket = buckets?.find(bucket => bucket.name === 'catalogues');
      
      if (!cataloguesBucket) {
        console.warn('⚠️ Catalogues bucket not found');
        setDebugInfo('⚠️ Storage bucket "catalogues" not found. Please create it in Supabase Dashboard.');
        return;
      }
      
      console.log('✅ Storage bucket found:', cataloguesBucket);
      setDebugInfo('✅ Storage configuration OK');
      
    } catch (error: any) {
      console.error('❌ Storage check failed:', error);
      setDebugInfo(`❌ Storage check failed: ${error.message}`);
    }
  };

  const fetchCatalogues = async () => {
    try {
      console.log('📊 Fetching catalogues...');
      setDebugInfo('Loading existing catalogues...');
      
      const { data, error } = await supabase
        .from('product_catalogues')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching catalogues:', error);
        setDebugInfo(`❌ Database error: ${error.message}`);
        
        if (error.code === '42P01') {
          toast({
            title: "Database Setup Required",
            description: "The product_catalogues table doesn't exist. Please run the SQL setup first.",
            variant: "destructive"
          });
          setDebugInfo('❌ Table "product_catalogues" not found. Please run SQL setup.');
        } else {
          toast({
            title: "Error",
            description: "Failed to load existing catalogues: " + error.message,
            variant: "destructive"
          });
        }
        return;
      }
      
      setCatalogues(data || []);
      console.log('✅ Catalogues loaded:', data?.length || 0);
      setDebugInfo(`✅ Loaded ${data?.length || 0} catalogues`);
      
    } catch (error: any) {
      console.error('❌ Fetch error:', error);
      setDebugInfo(`❌ Fetch failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      console.log('📁 File selected:', selectedFile.name, selectedFile.type, selectedFile.size);
      
      if (selectedFile.type === 'application/pdf') {
        if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
          toast({
            title: "File too large",
            description: "Please select a PDF file smaller than 10MB",
            variant: "destructive"
          });
          return;
        }
        setFile(selectedFile);
        // Auto-generate title from filename if not set
        if (!title) {
          const name = selectedFile.name.replace('.pdf', '').replace(/[_-]/g, ' ');
          setTitle(name.charAt(0).toUpperCase() + name.slice(1));
        }
        setDebugInfo(`✅ File ready: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file",
          variant: "destructive"
        });
        setDebugInfo(`❌ Invalid file type: ${selectedFile.type}`);
      }
    }
  };

  const uploadCatalogue = async () => {
    if (!file || !title.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a PDF file and enter a title",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setDebugInfo('🚀 Starting upload...');
    
    try {
      // Step 1: Check authentication
      console.log('🔐 Checking authentication...');
      setDebugInfo('🔐 Checking authentication...');
      setUploadProgress(10);
      
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      console.log('✅ User authenticated:', session.user.email);
      setDebugInfo('✅ Authentication OK');
      setUploadProgress(20);

      // Step 2: Prepare file upload
      console.log('📁 Preparing file upload...');
      setDebugInfo('📁 Preparing file upload...');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      console.log('📂 Upload path:', fileName);
      setUploadProgress(30);

      // Step 3: Upload to Supabase Storage
      console.log('☁️ Uploading to storage...');
      setDebugInfo('☁️ Uploading to storage...');
      setUploadProgress(40);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('catalogues')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Storage bucket "catalogues" not found. Please create it in Supabase Dashboard > Storage.');
        } else if (uploadError.message.includes('Access denied')) {
          throw new Error('Storage access denied. Please check your storage policies.');
        } else {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
      }

      console.log('✅ File uploaded successfully:', uploadData);
      setDebugInfo('✅ File uploaded to storage');
      setUploadProgress(60);

      // Step 4: Get public URL
      console.log('🔗 Getting public URL...');
      setDebugInfo('🔗 Getting public URL...');
      
      const { data: { publicUrl } } = supabase.storage
        .from('catalogues')
        .getPublicUrl(fileName);

      console.log('🔗 Public URL:', publicUrl);
      setUploadProgress(70);

      // Step 5: Save to database
      console.log('💾 Saving to database...');
      setDebugInfo('💾 Saving catalogue record...');
      setUploadProgress(80);

      const { data: catalogueData, error: dbError } = await supabase
        .from('product_catalogues')
        .insert({
          title: title.trim(),
          file_name: fileName,
          file_url: publicUrl,
          file_size: file.size,
          uploaded_by: session.user.id,
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database error:', dbError);
        
        // Try to clean up the uploaded file
        await supabase.storage.from('catalogues').remove([fileName]);
        
        if (dbError.code === '42P01') {
          throw new Error('Database table "product_catalogues" not found. Please run the SQL setup first.');
        } else {
          throw new Error(`Database error: ${dbError.message}`);
        }
      }

      console.log('✅ Catalogue saved:', catalogueData);
      setUploadProgress(100);
      setDebugInfo('✅ Upload completed successfully!');

      toast({
        title: "Success!",
        description: "Product catalogue uploaded successfully",
      });

      // Reset form
      setFile(null);
      setTitle('');
      
      // Refresh catalogues list
      await fetchCatalogues();

    } catch (error: any) {
      console.error('❌ Upload failed:', error);
      setDebugInfo(`❌ Upload failed: ${error.message}`);
      
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload catalogue",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteCatalogue = async (catalogue: UploadedCatalogue) => {
    if (!confirm(`Are you sure you want to delete "${catalogue.title}"?`)) {
      return;
    }

    try {
      // Delete from storage
      const fileName = catalogue.file_url.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('catalogues')
          .remove([fileName]);
        
        if (storageError) {
          console.warn('⚠️ Storage deletion warning:', storageError);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('product_catalogues')
        .delete()
        .eq('id', catalogue.id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Catalogue deleted successfully",
      });

      // Refresh list
      await fetchCatalogues();

    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete catalogue",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <Button
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="mb-4 bg-white/80"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Debug Info Panel - Only show if there are issues */}
        {debugInfo && !debugInfo.includes('✅') && (
          <Card className="mb-4 bg-yellow-50 border-yellow-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-mono text-yellow-800">{debugInfo}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Upload className="w-6 h-6 text-blue-600" />
                Upload Product Catalogue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="title">Catalogue Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Product Catalogue 2024"
                  className="mt-2"
                  disabled={uploading}
                />
              </div>

              <div>
                <Label htmlFor="pdf-file">Select PDF File</Label>
                <Input
                  id="pdf-file"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="mt-2"
                  disabled={uploading}
                />
                <p className="text-sm text-gray-600 mt-2">
                  Upload a PDF file (max 10MB). This will be displayed to all users.
                </p>
              </div>

              {file && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{file.name}</span>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <Button 
                onClick={uploadCatalogue} 
                disabled={!file || !title.trim() || uploading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Catalogue'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Catalogues */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-green-600" />
                Existing Catalogues ({catalogues.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                  <p>Loading catalogues...</p>
                </div>
              ) : catalogues.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No catalogues uploaded yet</p>
                  <p className="text-sm">Upload your first product catalogue to get started</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {catalogues.map((catalogue) => (
                    <div key={catalogue.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{catalogue.title}</h4>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(catalogue.file_size)} • 
                          {new Date(catalogue.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(catalogue.file_url, '_blank')}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteCatalogue(catalogue)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CatalogueUploader;