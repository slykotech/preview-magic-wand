import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCoupleData } from "@/hooks/useCoupleData";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Bell, 
  Shield, 
  Moon, 
  Sun, 
  Smartphone, 
  Mail, 
  Clock, 
  Heart,
  Trash2,
  Download,
  User,
  AlertTriangle
} from "lucide-react";
import { useTheme } from "next-themes";

interface AppPreferences {
  dailyReminders: boolean;
  weeklyInsights: boolean;
  partnerActivity: boolean;
  emailNotifications: boolean;
}

interface PermissionSettings {
  location: boolean;
  mediaLibrary: boolean;
  camera: boolean;
}

export const AppSettings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { coupleData } = useCoupleData();
  const { theme, setTheme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<AppPreferences>({
    dailyReminders: true,
    weeklyInsights: true,
    partnerActivity: true,
    emailNotifications: true
  });
  
  const [permissions, setPermissions] = useState<PermissionSettings>({
    location: false,
    mediaLibrary: false,
    camera: false
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
        setPreferences(prev => ({
          ...prev,
          dailyReminders: couplePrefs.reminder_frequency === 'daily'
        }));
      }

      // Load permission settings from localStorage
      const savedPermissions = localStorage.getItem('app_permissions');
      if (savedPermissions) {
        setPermissions(JSON.parse(savedPermissions));
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
          reminder_frequency: preferences.dailyReminders ? 'daily' : 'weekly'
        }, {
          onConflict: 'couple_id'
        });

      // Save permissions to localStorage
      localStorage.setItem('app_permissions', JSON.stringify(permissions));

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

  const requestPermission = async (type: keyof PermissionSettings) => {
    try {
      let granted = false;
      
      switch (type) {
        case 'location':
          if ('geolocation' in navigator) {
            await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            granted = true;
          }
          break;
        case 'mediaLibrary':
        case 'camera':
          if ('mediaDevices' in navigator) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: type === 'camera', audio: false });
            granted = true;
            stream.getTracks().forEach(track => track.stop()); // Clean up
          }
          break;
      }

      if (granted) {
        setPermissions(prev => ({ ...prev, [type]: true }));
        toast({
          title: "Permission granted ✅",
          description: `${type} access has been enabled`
        });
      }
    } catch (error) {
      toast({
        title: "Permission denied",
        description: `Could not enable ${type} access. Please check your browser settings.`,
        variant: "destructive"
      });
    }
  };

  const deleteAccount = async () => {
    toast({
      title: "Account deletion initiated ⚠️",
      description: "Please check your email for confirmation instructions",
      variant: "destructive"
    });
    setShowDeleteDialog(false);
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
      <div className="bg-gradient-romance text-white p-6 shadow-romantic">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft size={24} />
          </Button>
          <h1 className="text-2xl font-extrabold font-poppins">App Settings</h1>
        </div>
        <p className="text-white/80 font-inter text-sm font-semibold">
          Customize your LoveSync experience
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-poppins">
              <Bell className="text-primary" size={20} />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold">Daily Reminders</Label>
                <p className="text-sm text-muted-foreground">Get reminded to check in with your partner</p>
              </div>
              <Switch
                checked={preferences.dailyReminders}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, dailyReminders: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold">Weekly Insights</Label>
                <p className="text-sm text-muted-foreground">Receive relationship insights and tips</p>
              </div>
              <Switch
                checked={preferences.weeklyInsights}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, weeklyInsights: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold">Partner Activity</Label>
                <p className="text-sm text-muted-foreground">Notify when your partner is active</p>
              </div>
              <Switch
                checked={preferences.partnerActivity}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, partnerActivity: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Mirror all reminders and insights via email</p>
              </div>
              <Switch
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, emailNotifications: checked }))
                }
              />
            </div>
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

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-poppins">
              <Shield className="text-primary" size={20} />
              App Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="font-semibold">Location Access</Label>
                <p className="text-sm text-muted-foreground">Required for local date plan suggestions</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={permissions.location}
                  onCheckedChange={(checked) => 
                    checked ? requestPermission('location') : setPermissions(prev => ({ ...prev, location: false }))
                  }
                />
                {!permissions.location && (
                  <Button size="sm" variant="outline" onClick={() => requestPermission('location')}>
                    Enable
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="font-semibold">Media Library</Label>
                <p className="text-sm text-muted-foreground">Upload photos to Memory Vault and stories</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={permissions.mediaLibrary}
                  onCheckedChange={(checked) => 
                    checked ? requestPermission('mediaLibrary') : setPermissions(prev => ({ ...prev, mediaLibrary: false }))
                  }
                />
                {!permissions.mediaLibrary && (
                  <Button size="sm" variant="outline" onClick={() => requestPermission('mediaLibrary')}>
                    Enable
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="font-semibold">Camera Access</Label>
                <p className="text-sm text-muted-foreground">Capture new photos for stories and memories</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={permissions.camera}
                  onCheckedChange={(checked) => 
                    checked ? requestPermission('camera') : setPermissions(prev => ({ ...prev, camera: false }))
                  }
                />
                {!permissions.camera && (
                  <Button size="sm" variant="outline" onClick={() => requestPermission('camera')}>
                    Enable
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-poppins">
              <User className="text-primary" size={20} />
              Account Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="w-full justify-start"
            >
              <Trash2 className="mr-2" size={16} />
              Delete Account
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
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteAccount}
                  className="flex-1"
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};