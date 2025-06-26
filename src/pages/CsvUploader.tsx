import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase'; // ✅ Make sure you import your supabase client

const CsvUploaderPage: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; tableName?: string } | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
    } else if (selectedFile) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive"
      });
    }
  };

  // ✅ CORRECTED FUNCTION
  const processCSV = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // 1. Get the current user's session and access token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Authentication error: Could not get user session. Please log in again.');
      }
      const accessToken = session.access_token;

      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV must have at least a header row and one data row');
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const tableName = file.name.replace('.csv', '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const columnDefs = headers.map(header => `"${header}" TEXT`).join(', ');
      const createTableQuery = `CREATE TABLE IF NOT EXISTS "${tableName}" (id SERIAL PRIMARY KEY, ${columnDefs});`;

      // 2. Call the Edge Function with the user's token
      const response = await fetch('https://hjaqnjjptipnxeonojip.supabase.co/functions/v1/77ef7376-0f30-4506-86a4-1fa6f75989ac', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}` // ✅ Use the user's real token
        },
        body: JSON.stringify({ 
          action: 'create_table',
          tableName,
          query: createTableQuery,
          data: lines.slice(1),
          headers
        })
      });

      const resultJson = await response.json();

      if (!response.ok) {
        // Throw error from function response if available, otherwise default HTTP error
        throw new Error(resultJson.error || `HTTP Error: ${response.status} ${response.statusText}`);
      }
      
      setResult({ success: true, message: `Table '${tableName}' created and populated successfully!`, tableName });
      toast({
        title: "Success!",
        description: `CSV data imported to table '${tableName}'`
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setResult({ success: false, message: errorMessage });
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <Button
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="mb-4 bg-white/80"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Upload className="w-6 h-6 text-green-600" />
              CSV Database Importer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="csv-file">Select CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="mt-2"
                disabled={uploading}
              />
              <p className="text-sm text-gray-600 mt-2">
                Upload a CSV to automatically create and populate a database table.
              </p>
            </div>

            {file && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}

            <Button 
              onClick={processCSV} 
              disabled={!file || uploading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {uploading ? 'Processing...' : 'Import CSV to Database'}
            </Button>

            {result && (
              <div className={`flex items-start gap-3 p-4 rounded-lg ${
                result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {result.success ? <CheckCircle className="w-5 h-5 mt-0.5 text-green-600" /> : <AlertCircle className="w-5 h-5 mt-0.5 text-red-600" />}
                <div>
                  <p className="font-medium">{result.success ? 'Success!' : 'Error'}</p>
                  <p className="text-sm">{result.message}</p>
                  {result.tableName && ( <p className="text-xs mt-1">Table name: {result.tableName}</p> )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CsvUploaderPage;