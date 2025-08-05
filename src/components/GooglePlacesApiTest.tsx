import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ApiTestResult {
  success: boolean;
  message: string;
  status?: string;
  results_found?: number;
  error?: string;
}

export const GooglePlacesApiTest = () => {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ApiTestResult | null>(null);

  const testGooglePlacesApi = async () => {
    setTesting(true);
    setResult(null);

    try {
      console.log('Testing Google Places API...');

      const { data, error } = await supabase.functions.invoke('test-google-places', {
        body: { test: 'api_validation' }
      });

      if (error) {
        throw error;
      }

      console.log('API test result:', data);
      setResult(data);

      if (data.success) {
        toast({
          title: "Google Places API Working! ✅",
          description: `Found ${data.results_found} places near Hyderabad`,
        });
      } else {
        toast({
          title: "Google Places API Issue ❌",
          description: data.error,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error testing Google Places API:', error);
      
      const errorResult = {
        success: false,
        message: "Failed to test API",
        error: error.message
      };
      
      setResult(errorResult);

      toast({
        title: "API Test Failed",
        description: `Error: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = () => {
    if (testing) return <Loader2 className="w-5 h-5 animate-spin" />;
    if (!result) return null;
    if (result.success) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = () => {
    if (!result) return "";
    return result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50";
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Google Places API Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Test your Google Places API key to see why no events are being found.</p>
        </div>

        <Button 
          onClick={testGooglePlacesApi}
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing API...
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 mr-2" />
              Test Google Places API
            </>
          )}
        </Button>

        {result && (
          <div className={`p-3 rounded-lg border ${getStatusColor()}`}>
            <div className="flex items-center gap-2 text-sm font-medium">
              {getStatusIcon()}
              <span>API Status</span>
            </div>
            <p className="text-sm mt-1">{result.message}</p>
            {result.results_found !== undefined && (
              <p className="text-xs mt-1 text-muted-foreground">
                Places found: {result.results_found}
              </p>
            )}
            {result.error && (
              <p className="text-xs mt-1 text-red-600">
                Error: {result.error}
              </p>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>💡 If the API fails, you may need to:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Enable Google Places API in Google Cloud Console</li>
            <li>Enable billing for your Google Cloud project</li>
            <li>Check API key restrictions</li>
            <li>Verify API key is valid</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};