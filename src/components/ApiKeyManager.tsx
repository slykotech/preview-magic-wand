import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Key, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";

interface ApiKeyConfig {
  name: string;
  description: string;
  required: boolean;
  signupUrl: string;
  status: 'missing' | 'configured' | 'unknown';
}

const API_CONFIGS: ApiKeyConfig[] = [
  {
    name: 'EVENTBRITE_API_KEY',
    description: 'Eventbrite API for fetching real events worldwide',
    required: true,
    signupUrl: 'https://www.eventbrite.com/platform/api-keys',
    status: 'unknown'
  },
  {
    name: 'TICKETMASTER_API_KEY', 
    description: 'Ticketmaster API for concert and event data',
    required: true,
    signupUrl: 'https://developer.ticketmaster.com/products-and-docs/apis/getting-started/',
    status: 'unknown'
  },
  {
    name: 'GOOGLE_PLACES_API_KEY',
    description: 'Google Places API for venue information and location-based events',
    required: false,
    signupUrl: 'https://developers.google.com/maps/documentation/places/web-service/get-api-key',
    status: 'unknown'
  },
  {
    name: 'FIRECRAWL_API_KEY',
    description: 'Firecrawl API for web scraping additional event sources',
    required: false,
    signupUrl: 'https://firecrawl.dev',
    status: 'unknown'
  }
];

export const ApiKeyManager = () => {
  const { toast } = useToast();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  const toggleKeyVisibility = (keyName: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyName]: !prev[keyName]
    }));
  };

  const handleKeyChange = (keyName: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [keyName]: value
    }));
  };

  const saveApiKey = async (keyName: string) => {
    const keyValue = apiKeys[keyName];
    if (!keyValue) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive"
      });
      return;
    }

    // Here you would normally save to Supabase Edge Function Secrets
    // For now, we'll show a placeholder message
    toast({
      title: "API Key Configuration",
      description: `To configure ${keyName}, please add it to your Supabase Edge Function Secrets in the dashboard.`,
    });
  };

  const getStatusBadge = (config: ApiKeyConfig) => {
    switch (config.status) {
      case 'configured':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle size={12} className="mr-1" />Configured</Badge>;
      case 'missing':
        return <Badge variant="destructive"><AlertCircle size={12} className="mr-1" />Missing</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key size={20} />
            API Key Configuration
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure API keys for event data sources. These keys enable fetching real events from various platforms.
          </p>
        </CardHeader>
      </Card>

      {/* API Keys Grid */}
      <div className="grid gap-4">
        {API_CONFIGS.map((config) => (
          <Card key={config.name} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{config.name.replace('_API_KEY', '').replace('_', ' ')}</CardTitle>
                  {getStatusBadge(config)}
                  {config.required && <Badge variant="outline">Required</Badge>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(config.signupUrl, '_blank')}
                  className="flex items-center gap-1"
                >
                  <ExternalLink size={14} />
                  Get API Key
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor={config.name}>API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id={config.name}
                      type={showKeys[config.name] ? "text" : "password"}
                      value={apiKeys[config.name] || ""}
                      onChange={(e) => handleKeyChange(config.name, e.target.value)}
                      placeholder="Enter your API key..."
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => toggleKeyVisibility(config.name)}
                    >
                      {showKeys[config.name] ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={() => saveApiKey(config.name)}
                    disabled={!apiKeys[config.name]}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">Configuration Instructions</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>1. Click "Get API Key" to sign up for each service</p>
                <p>2. Copy your API keys from the respective platforms</p>
                <p>3. Add them to your Supabase Edge Function Secrets:</p>
                <p className="ml-4">• Go to Supabase Dashboard → Settings → Functions</p>
                <p className="ml-4">• Add each key with the exact name shown above</p>
                <p>4. Test the event population to verify the keys are working</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};