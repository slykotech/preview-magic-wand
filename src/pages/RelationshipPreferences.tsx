import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/BottomNavigation";
import { RelationshipInfoSection } from "@/components/RelationshipInfoSection";
import { Heart, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const RelationshipPreferences = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-romance text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/profile')}
            className="text-white hover:bg-white/20 p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Heart size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold font-poppins">Relationship Info</h1>
            <p className="text-white/80 text-sm font-inter font-bold">
              Manage your relationship details
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Relationship Info Section */}
        <RelationshipInfoSection />
        
        {/* Dashboard Navigation */}
        <div className="pt-4">
          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gradient-primary hover:opacity-90 text-white py-3"
            size="lg"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};