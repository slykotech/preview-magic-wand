import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCoupleData } from '@/hooks/useCoupleData';
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ImportantDate {
  id: string;
  title: string;
  date_value: string;
  description?: string;
  date_type: string;
}

export const ImportantDates = () => {
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    date_value: undefined as Date | undefined,
    description: "",
    date_type: "special"
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { coupleData } = useCoupleData();

  useEffect(() => {
    if (user && coupleData) {
      fetchImportantDates();
    }
  }, [user, coupleData]);

  const fetchImportantDates = async () => {
    if (!coupleData) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('important_dates')
        .select('*')
        .eq('couple_id', coupleData.id)
        .order('date_value', { ascending: true });

      if (error) throw error;
      setDates(data || []);
    } catch (error) {
      console.error('Error fetching important dates:', error);
      toast({
        title: "Error loading dates",
        description: "Failed to load your important dates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDate = async () => {
    if (!user || !coupleData || !formData.title || !formData.date_value) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('important_dates')
        .insert({
          couple_id: coupleData.id,
          created_by: user.id,
          title: formData.title,
          date_value: format(formData.date_value, 'yyyy-MM-dd'),
          description: formData.description,
          date_type: formData.date_type
        });

      if (error) throw error;

      toast({
        title: "Date added! 📅",
        description: "Your important date has been saved"
      });

      setFormData({
        title: "",
        date_value: undefined,
        description: "",
        date_type: "special"
      });
      setShowAddForm(false);
      fetchImportantDates();
    } catch (error) {
      console.error('Error adding date:', error);
      toast({
        title: "Error adding date",
        description: "Failed to save your important date",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDate = async (dateId: string) => {
    try {
      const { error } = await supabase
        .from('important_dates')
        .delete()
        .eq('id', dateId);

      if (error) throw error;

      toast({
        title: "Date removed",
        description: "Important date has been deleted"
      });

      fetchImportantDates();
    } catch (error) {
      console.error('Error deleting date:', error);
      toast({
        title: "Error deleting date",
        description: "Failed to delete the important date",
        variant: "destructive"
      });
    }
  };

  const getDateTypeIcon = (type: string) => {
    switch (type) {
      case 'anniversary':
        return '💕';
      case 'birthday':
        return '🎂';
      case 'special':
      default:
        return '⭐';
    }
  };

  const getDateTypeColor = (type: string) => {
    switch (type) {
      case 'anniversary':
        return 'text-rose-600 bg-rose-50';
      case 'birthday':
        return 'text-amber-600 bg-amber-50';
      case 'special':
      default:
        return 'text-purple-600 bg-purple-50';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/profile')}
          className="rounded-full"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold font-poppins text-foreground">
            LoveLog: Dates That Matter
          </h1>
          <p className="text-muted-foreground font-inter text-sm font-semibold">
            Keep track of anniversaries, birthdays, and special moments
          </p>
        </div>
      </div>

      {/* Add New Date Button */}
      <div className="mb-6">
        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-gradient-romance text-white hover:opacity-90 font-poppins font-bold"
        >
          <Plus size={20} className="mr-2" />
          Add Important Date
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="mb-6 border-2 border-sunrise-coral/20 shadow-romantic">
          <CardHeader>
            <h3 className="text-lg font-extrabold font-poppins text-foreground">
              Add New Important Date
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="font-inter font-bold">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Our Anniversary, Sarah's Birthday"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="font-inter"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-inter font-bold">Date Type *</Label>
                <Select
                  value={formData.date_type}
                  onValueChange={(value) => setFormData({ ...formData, date_type: value })}
                >
                  <SelectTrigger className="font-inter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anniversary">💕 Anniversary</SelectItem>
                    <SelectItem value="birthday">🎂 Birthday</SelectItem>
                    <SelectItem value="special">⭐ Special Moment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-inter font-bold">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal font-inter",
                      !formData.date_value && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date_value ? format(formData.date_value, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date_value}
                    onSelect={(date) => setFormData({ ...formData, date_value: date })}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-inter font-bold">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any special notes about this date..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="font-inter"
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleAddDate}
                className="bg-gradient-romance text-white hover:opacity-90 font-poppins font-bold"
              >
                Save Date
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAddForm(false)}
                className="font-poppins font-bold"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dates List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground font-inter font-semibold">Loading your important dates...</p>
          </div>
        ) : dates.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <p className="text-muted-foreground font-inter font-semibold mb-2">
                No important dates added yet
              </p>
              <p className="text-sm text-muted-foreground font-inter">
                Start adding anniversaries, birthdays, and special moments to remember!
              </p>
            </CardContent>
          </Card>
        ) : (
          dates.map((date) => (
            <Card key={date.id} className="hover:shadow-soft transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-lg",
                      getDateTypeColor(date.date_type)
                    )}>
                      {getDateTypeIcon(date.date_type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-poppins font-extrabold text-foreground text-lg">
                        {date.title}
                      </h3>
                      <p className="font-inter font-bold text-sunrise-coral text-sm mb-1">
                        {format(new Date(date.date_value), "MMMM d, yyyy")}
                      </p>
                      {date.description && (
                        <p className="text-muted-foreground font-inter text-sm">
                          {date.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDate(date.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Go to Dashboard Button */}
      <div className="mt-8 pt-6 border-t border-border">
        <Button 
          onClick={() => navigate('/dashboard')}
          className="w-full bg-gradient-primary hover:opacity-90 text-white font-poppins font-bold"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};