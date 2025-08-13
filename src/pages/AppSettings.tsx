import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCoupleData } from "@/hooks/useCoupleData";
import { supabase } from "@/integrations/supabase/client";
import { MobilePermissionManager } from "@/components/MobilePermissionManager";
import { 
  ArrowLeft, 
  Bell, 
  Moon, 
  Sun, 
  Trash2,
  AlertTriangle
} from "lucide-react";
import { useTheme } from "next-themes";

export const AppSettings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { coupleData } = useCoupleData();
  const { theme, setTheme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appNotifications, setAppNotifications] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [coupleData]);

  const loadSettings = async () => {
    if (!coupleData) return;
    
    try {
      setLoading(true);
      
      // Load couple preferences
      const { data: couplePrefs } = await supabase
        .from('couple_preferences')
        .select('*')
        .eq('couple_id', coupleData.id)
        .maybeSingle();

      if (couplePrefs) {
        setAppNotifications(couplePrefs.reminder_frequency === 'daily');
      }

      // Load notification settings from localStorage
      const savedNotifications = localStorage.getItem('app_notifications');
      if (savedNotifications !== null) {
        setAppNotifications(JSON.parse(savedNotifications));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error loading settings",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!coupleData) return;
    
    try {
      setSaving(true);
      
      // Update couple preferences
      const { error } = await supabase
        .from('couple_preferences')
        .upsert({
          couple_id: coupleData.id,
          reminder_frequency: appNotifications ? 'daily' : 'off'
        }, {
          onConflict: 'couple_id'
        });

      // Save notifications to localStorage
      localStorage.setItem('app_notifications', JSON.stringify(appNotifications));

      if (error) throw error;

      toast({
        title: "Settings saved successfully! ✅",
        description: "Your preferences have been updated"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error saving settings",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "No user session found. Please sign in again.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsDeleting(true);
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No valid session found. Please sign in again.');
      }

      console.log('Calling delete-account function...');
      
      // Call the delete-account edge function
      const { data, error } = await supabase.functions.invoke('delete-account', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Delete function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Server error:', data.error);
        throw new Error(data.error);
      }

      // Clear local storage and state
      localStorage.clear();
      sessionStorage.clear();
      
      // Sign out (this will also clear the session)
      await supabase.auth.signOut();

      // Show success message
      toast({
        title: "Account deleted successfully",
        description: "Your account and data have been permanently deleted."
      });

      // Redirect to signup page after a brief delay
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
      
    } catch (error: any) {
      console.error('Error deleting account:', error);
      
      let errorMessage = "Please try again. If the problem persists, contact support.";
      
      if (error.message?.includes('session') || error.message?.includes('auth')) {
        errorMessage = "Session expired. Please sign in again and try deleting your account.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Unable to delete your account",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-romance text-white p-4 sm:p-6 shadow-romantic">
        <div className="flex items-center gap-3 sm:gap-4 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft size={24} />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">App Settings</h1>
        </div>
        <p className="text-white/80 text-sm font-semibold">
          Customize your LoveStory experience
        </p>
      </div>

      {/* Mobile Permission Manager */}
      <MobilePermissionManager />

      <div className="p-6 space-y-6">
        {/* App Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-poppins">
              <Bell className="text-primary" size={20} />
              App Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <Label className="font-semibold">Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">Get reminded to check in with your partner and receive updates</p>
            </div>
            <Switch
              checked={appNotifications}
              onCheckedChange={setAppNotifications}
            />
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-poppins">
              {theme === 'dark' ? <Moon className="text-primary" size={20} /> : <Sun className="text-primary" size={20} />}
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold">Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-poppins text-destructive">
              <Trash2 className="text-destructive" size={20} />
              Delete Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="w-full justify-center"
              disabled={isDeleting}
            >
              <Trash2 className="mr-2" size={16} />
              Delete My Account
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/profile')}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="flex-1"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Delete Account Confirmation */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle size={20} />
                Delete Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Are you sure you want to permanently delete your account and all of your data (memories, check-ins, profiles, partner connections)? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1"
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteAccount}
                  className="flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Forever"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};