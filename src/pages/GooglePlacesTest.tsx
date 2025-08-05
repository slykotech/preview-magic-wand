import { GooglePlacesApiTest } from '@/components/GooglePlacesApiTest';

const GooglePlacesTestPage = () => {
  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Google Places API Test
          </h1>
          <p className="text-muted-foreground">
            Test your Google Places API key configuration
          </p>
        </div>
        
        <GooglePlacesApiTest />
        
        <div className="text-center">
          <a 
            href="/dashboard" 
            className="text-primary hover:underline"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
};

export default GooglePlacesTestPage;