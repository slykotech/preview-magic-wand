import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { TimePicker } from "@/components/ui/time-picker";
import { BottomNavigation } from "@/components/BottomNavigation";
import { GradientHeader } from "@/components/GradientHeader";
import { ConfirmDialog } from "@/components/ui/alert-dialog-confirm";
import { CalendarIcon, MapPin, Clock, Heart, Star, CalendarPlus, Edit, Calendar as CalendarClock, Plus, Sparkles, Music, Save, X, Trash2, LucideIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleData } from '@/hooks/useCoupleData';

interface DateIdea {
  id: string;
  title: string;
  description: string;
  category: string;
  estimated_duration?: string;
  estimated_cost?: string;
  location?: string;
  couple_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_completed?: boolean;
  completed_date?: string;
  notes?: string;
  rating?: number;
  scheduled_date?: string;
  scheduled_time?: string;
}

export const DatePlanner = () => {
  const [activeTab, setActiveTab] = useState<'planned'>('planned');
  const [plannedDates, setPlannedDates] = useState<DateIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingDate, setEditingDate] = useState<DateIdea | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dateToDelete, setDateToDelete] = useState<DateIdea | null>(null);
  const [showUnsuccessfulOptions, setShowUnsuccessfulOptions] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    date: undefined as Date | undefined,
    time: '',
    category: 'romantic'
  });
  const [editEvent, setEditEvent] = useState({
    title: '',
    description: '',
    location: '',
    date: undefined as Date | undefined,
    time: '',
    category: 'romantic'
  });

  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { coupleData } = useCoupleData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user && coupleData?.id) {
      fetchPlannedDates();
    }
  }, [user, authLoading, navigate, coupleData?.id]);

  const fetchPlannedDates = async () => {
    try {
      if (!coupleData?.id) return;
      const { data, error } = await supabase
        .from('date_ideas')
        .select('*')
        .eq('couple_id', coupleData.id)
        .eq('is_completed', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPlannedDates(data || []);
    } catch (error) {
      console.error('Error fetching planned dates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time || !coupleData?.id) {
      toast({
        title: "Missing details! ⏰",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('date_ideas')
        .insert({
          title: newEvent.title,
          description: newEvent.description,
          location: newEvent.location,
          category: newEvent.category,
          couple_id: coupleData.id,
          created_by: user?.id,
          scheduled_date: newEvent.date.toISOString().split('T')[0],
          scheduled_time: newEvent.time,
          is_completed: false
        });

      if (error) throw error;

      toast({
        title: "Date added! 💕",
        description: `${newEvent.title} has been added to your planner`
      });

      setShowAddForm(false);
      setNewEvent({
        title: '',
        description: '',
        location: '',
        date: undefined,
        time: '',
        category: 'romantic'
      });
      fetchPlannedDates();
    } catch (error) {
      console.error('Error adding event:', error);
      toast({
        title: "Error adding event",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleEditDate = (date: DateIdea) => {
    setEditingDate(date);
    setEditEvent({
      title: date.title,
      description: date.description || '',
      location: date.location || '',
      date: date.scheduled_date ? new Date(date.scheduled_date) : undefined,
      time: date.scheduled_time || '',
      category: date.category || 'romantic'
    });
    setShowEditForm(true);
  };

  const handleUpdateEvent = async () => {
    if (!editingDate || !editEvent.title || !editEvent.date || !editEvent.time) {
      toast({
        title: "Missing details! ⏰",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('date_ideas')
        .update({
          title: editEvent.title,
          description: editEvent.description,
          location: editEvent.location,
          category: editEvent.category,
          scheduled_date: editEvent.date.toISOString().split('T')[0],
          scheduled_time: editEvent.time
        })
        .eq('id', editingDate.id);

      if (error) throw error;

      toast({
        title: "Date updated! 💕",
        description: `${editEvent.title} has been updated successfully`
      });

      setShowEditForm(false);
      setEditingDate(null);
      fetchPlannedDates();
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error updating event",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleDateFeedback = async (dateId: string, wasSuccessful: boolean) => {
    if (wasSuccessful) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase
          .from('date_ideas')
          .update({
            is_completed: true,
            completed_date: today,
            rating: 5,
            notes: 'Date was successful!',
            updated_at: new Date().toISOString()
          })
          .eq('id', dateId);

        if (error) throw error;

        toast({
          title: "Great! Date added to history 💕",
          description: "Your successful date has been added to your date history in the profile tab."
        });
        fetchPlannedDates();
      } catch (error) {
        console.error('Error updating date feedback:', error);
        toast({
          title: "Error saving feedback",
          description: "There was an error saving your feedback. Please try again.",
          variant: "destructive"
        });
      }
    } else {
      setShowUnsuccessfulOptions(dateId);
    }
  };

  const handleUnsuccessfulAction = async (dateId: string, action: 'reschedule' | 'delete') => {
    if (action === 'reschedule') {
      const dateToReschedule = plannedDates.find(d => d.id === dateId);
      if (dateToReschedule) {
        handleEditDate(dateToReschedule);
      }
    } else if (action === 'delete') {
      const dateToDeleteObj = plannedDates.find(d => d.id === dateId);
      if (dateToDeleteObj) {
        setDateToDelete(dateToDeleteObj);
        setShowDeleteConfirm(true);
      }
    }
    setShowUnsuccessfulOptions(null);
  };

  const handleDeleteDate = async () => {
    if (!dateToDelete) return;

    try {
      const { error } = await supabase
        .from('date_ideas')
        .delete()
        .eq('id', dateToDelete.id);

      if (error) throw error;

      toast({
        title: "Date deleted! 🗑️",
        description: `${dateToDelete.title} has been removed from your planner`
      });

      setDateToDelete(null);
      setShowDeleteConfirm(false);
      fetchPlannedDates();
    } catch (error) {
      console.error('Error deleting date:', error);
      toast({
        title: "Error deleting date",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const getDatesByCategory = () => {
    const categoryMap: { [key: string]: DateIdea[] } = {};
    plannedDates.forEach(date => {
      const category = date.category || 'Other';
      if (!categoryMap[category]) {
        categoryMap[category] = [];
      }
      categoryMap[category].push(date);
    });
    return categoryMap;
  };

  const categories = ['romantic', 'adventure', 'cultural', 'food', 'sports', 'entertainment', 'outdoor', 'relaxation'];
  const categoryIcons = {
    romantic: '💕',
    adventure: '🗻',
    cultural: '🎭',
    food: '🍽️',
    sports: '⚽',
    entertainment: '🎪',
    outdoor: '🌳',
    relaxation: '🧘'
  };

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <GradientHeader
        title="Date Planner"
        subtitle="Plan your perfect dates together"
        icon={<Heart size={24} />}
        className="text-center py-6"
      />

      <div className="container mx-auto px-4 pb-20">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'planned')} className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="planned" className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Planned Dates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planned" className="mt-6 space-y-6">
            {/* Add New Date Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Your Planned Dates</h3>
              <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Date
              </Button>
            </div>

            {/* Add New Date Form */}
            {showAddForm && (
              <div className="bg-card rounded-lg p-6 border shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-medium">Add New Date</h4>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="Romantic dinner at..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <select
                      value={newEvent.category}
                      onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                      className="w-full p-2 border rounded-md"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {categoryIcons[cat as keyof typeof categoryIcons]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newEvent.date ? format(newEvent.date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={newEvent.date}
                          onSelect={(date) => setNewEvent({ ...newEvent, date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Time *</Label>
                    <TimePicker
                      value={newEvent.time}
                      onChange={(time) => setNewEvent({ ...newEvent, time })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      placeholder="Restaurant name, park, etc."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Describe what you plan to do..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddEvent}>
                    <Save className="h-4 w-4 mr-2" />
                    Add Date
                  </Button>
                </div>
              </div>
            )}

            {/* Planned Dates List */}
            {loading ? (
              <div className="text-center py-8">Loading your planned dates...</div>
            ) : plannedDates.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No planned dates yet</h3>
                <p className="text-muted-foreground mb-4">Start planning your perfect dates together!</p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Plan Your First Date
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(getDatesByCategory()).map(([category, dates]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="text-md font-medium flex items-center gap-2">
                      <span>{categoryIcons[category as keyof typeof categoryIcons]}</span>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                      <Badge variant="secondary">{dates.length}</Badge>
                    </h4>
                    <div className="grid gap-3">
                      {dates.map((date) => (
                        <div key={date.id} className="bg-card rounded-lg p-4 border shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h5 className="font-medium">{date.title}</h5>
                              {date.description && (
                                <p className="text-sm text-muted-foreground mt-1">{date.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEditDate(date)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDateToDelete(date);
                                  setShowDeleteConfirm(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                            {date.scheduled_date && (
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-4 w-4" />
                                {format(new Date(date.scheduled_date), "PPP")}
                              </div>
                            )}
                            {date.scheduled_time && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {date.scheduled_time}
                              </div>
                            )}
                            {date.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {date.location}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDateFeedback(date.id, true)}
                              className="flex items-center gap-1"
                            >
                              <Heart className="h-4 w-4" />
                              Mark as Done
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDateFeedback(date.id, false)}
                            >
                              Didn't happen
                            </Button>
                          </div>

                          {/* Unsuccessful options */}
                          {showUnsuccessfulOptions === date.id && (
                            <div className="mt-3 p-3 bg-muted rounded-lg space-y-2">
                              <p className="text-sm font-medium">What would you like to do?</p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUnsuccessfulAction(date.id, 'reschedule')}
                                >
                                  Reschedule
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUnsuccessfulAction(date.id, 'delete')}
                                >
                                  Remove
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setShowUnsuccessfulOptions(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Date Form */}
        {showEditForm && editingDate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium">Edit Date</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowEditForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    value={editEvent.title}
                    onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <select
                    value={editEvent.category}
                    onChange={(e) => setEditEvent({ ...editEvent, category: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {categoryIcons[cat as keyof typeof categoryIcons]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editEvent.date ? format(editEvent.date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={editEvent.date}
                        onSelect={(date) => setEditEvent({ ...editEvent, date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-time">Time *</Label>
                  <TimePicker
                    value={editEvent.time}
                    onChange={(time) => setEditEvent({ ...editEvent, time })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-location">Location</Label>
                  <Input
                    id="edit-location"
                    value={editEvent.location}
                    onChange={(e) => setEditEvent({ ...editEvent, location: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editEvent.description}
                    onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <Button variant="outline" onClick={() => setShowEditForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateEvent}>
                  <Save className="h-4 w-4 mr-2" />
                  Update Date
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          onConfirm={handleDeleteDate}
          title="Delete Date"
          description={`Are you sure you want to delete "${dateToDelete?.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      </div>

      <BottomNavigation />
    </div>
  );
};