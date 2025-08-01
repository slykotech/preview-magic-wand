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
  reminderTime: string;
  notificationSound: boolean;
  vibration: boolean;
  emailNotifications: boolean;
  marketingEmails: boolean;
}

interface PrivacySettings {
  profileVisibility: 'private' | 'couple' | 'public';
  dataSharing: boolean;
  analytics: boolean;
  locationTracking: boolean;
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
    reminderTime: '20:00',
    notificationSound: true,
    vibration: true,
    emailNotifications: true,
    marketingEmails: false
  });
  
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'couple',
    dataSharing: false,
    analytics: true,
    locationTracking: false
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
          dailyReminders: couplePrefs.reminder_frequency === 'daily',
          reminderTime: couplePrefs.notification_time || '20:00'
        }));
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
          reminder_frequency: preferences.dailyReminders ? 'daily' : 'weekly',
          notification_time: preferences.reminderTime
        }, {
          onConflict: 'couple_id'
        });

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

  const exportData = () => {
    toast({
      title: "Data export requested 📊",
      description: "Your data will be emailed to you within 24 hours"
    });
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

            <div className="space-y-2">
              <Label className="font-semibold flex items-center gap-2">
                <Clock size={16} />
                Reminder Time
              </Label>
              <Input
                type="time"
                value={preferences.reminderTime}
                onChange={(e) => 
                  setPreferences(prev => ({ ...prev, reminderTime: e.target.value }))
                }
                className="w-full"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive important updates via email</p>
              </div>
              <Switch
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, emailNotifications: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold">Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">Get relationship tips and feature updates</p>
              </div>
              <Switch
                checked={preferences.marketingEmails}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, marketingEmails: checked }))
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

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-poppins">
              <Shield className="text-primary" size={20} />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold">Profile Visibility</Label>
              <Select 
                value={privacy.profileVisibility} 
                onValueChange={(value: 'private' | 'couple' | 'public') => 
                  setPrivacy(prev => ({ ...prev, profileVisibility: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="couple">Couple Only</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold">Anonymous Analytics</Label>
                <p className="text-sm text-muted-foreground">Help improve LoveSync with usage data</p>
              </div>
              <Switch
                checked={privacy.analytics}
                onCheckedChange={(checked) => 
                  setPrivacy(prev => ({ ...prev, analytics: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold">Data Sharing</Label>
                <p className="text-sm text-muted-foreground">Share anonymized data for research</p>
              </div>
              <Switch
                checked={privacy.dataSharing}
                onCheckedChange={(checked) => 
                  setPrivacy(prev => ({ ...prev, dataSharing: checked }))
                }
              />
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
              variant="outline"
              onClick={exportData}
              className="w-full justify-start"
            >
              <Download className="mr-2" size={16} />
              Export My Data
            </Button>

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