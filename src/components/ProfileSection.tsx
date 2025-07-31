import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Edit3, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ProfileSectionProps {
  userProfile: any;
  onProfileUpdate: () => void;
}

export const ProfileSection = ({ userProfile, onProfileUpdate }: ProfileSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(userProfile?.display_name || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEdit = () => {
    setDisplayName(userProfile?.display_name || "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDisplayName(userProfile?.display_name || "");
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your display name",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(true);
    try {
      await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('user_id', user?.id);

      toast({
        title: "Profile Updated! 💕",
        description: "Your profile has been updated successfully",
      });

      setIsEditing(false);
      onProfileUpdate();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update your profile",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={20} />
            Your Profile
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="text-xs"
            >
              <Edit3 size={14} className="mr-1" />
              Edit
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div>
              <Label htmlFor="displayName">Your Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">User ID</Label>
              <p className="text-sm font-mono bg-muted p-2 rounded mt-1">
                {user?.id}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSave}
                disabled={isUpdating || !displayName.trim()}
                className="flex-1 bg-gradient-primary hover:opacity-90 text-white"
                size="sm"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={14} className="mr-1" />
                    Save
                  </>
                )}
              </Button>
              <Button 
                onClick={handleCancel}
                variant="outline"
                size="sm"
                disabled={isUpdating}
              >
                <X size={14} className="mr-1" />
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <Label className="text-sm text-muted-foreground">Display Name</Label>
              <p className="text-sm font-medium mt-1">
                {userProfile?.display_name || 'Not set'}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">User ID</Label>
              <p className="text-sm font-mono bg-muted p-2 rounded mt-1">
                {user?.id}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};