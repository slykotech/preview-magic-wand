import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/BottomNavigation";
import { RelationshipInfoSection } from "@/components/RelationshipInfoSection";
import { GradientHeader } from "@/components/GradientHeader";
import { Heart, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const RelationshipPreferences = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Gradient Header */}
      <GradientHeader
        title="Relationship Info"
        subtitle="Manage your relationship details"
        icon={<Heart size={24} />}
        backRoute="/profile"
      />

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