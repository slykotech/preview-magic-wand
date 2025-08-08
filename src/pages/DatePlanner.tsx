import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Clock, DollarSign, Heart, X, Plus, Trash2, Sparkles } from 'lucide-react';
import { GradientHeader } from '@/components/GradientHeader';
import { SweetSuggestions } from '@/components/SweetSuggestions';
import { EventDiscovery } from '@/components/EventDiscovery';

interface DateIdea {
  id: string;
  title: string;
  description?: string;
  category?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  estimated_cost?: string;
  estimated_duration?: string;
  location?: string;
  notes?: string;
  is_completed?: boolean;
  completed_date?: string;
  rating?: number;
  couple_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const DatePlanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { coupleData, loading: coupleLoading } = useCoupleData();
  const { toast } = useToast();
  
  const [plannedDates, setPlannedDates] = useState<DateIdea[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDate, setEditingDate] = useState<DateIdea | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'romantic',
    scheduled_date: '',
    scheduled_time: '',
    location: '',
    estimated_cost: '',
    estimated_duration: '',
    notes: ''
  });

  // Form for editing
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    category: 'romantic',
    scheduled_date: '',
    scheduled_time: '',
    location: '',
    estimated_cost: '',
    estimated_duration: '',
    notes: ''
  });

  const coupleId = coupleData?.id;
  
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (user && coupleId) {
      fetchPlannedDates();
    }
  }, [user, navigate, coupleId]);

  // Real-time subscription for date_ideas changes
  useEffect(() => {
    if (!coupleId) return;

    console.log('Setting up real-time subscription for date_ideas...');
    
    const channel = supabase
      .channel('date_ideas_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'date_ideas',
          filter: `couple_id=eq.${coupleId}`
        },
        (payload) => {
          console.log('Real-time date_ideas change:', payload);
          
          if (payload.eventType === 'DELETE') {
            // Remove the deleted item from local state
            setPlannedDates(prev => prev.filter(date => date.id !== payload.old?.id));
          } else if (payload.eventType === 'INSERT') {
            // Add new item if it's not completed
            const newDate = payload.new as DateIdea;
            if (!newDate.is_completed) {
              setPlannedDates(prev => {
                // Prevent duplicates
                if (prev.some(date => date.id === newDate.id)) return prev;
                return [newDate, ...prev];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            // Update existing item
            const updatedDate = payload.new as DateIdea;
            setPlannedDates(prev => prev.map(date => 
              date.id === updatedDate.id ? updatedDate : date
            ));
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription...');
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  const fetchPlannedDates = async () => {
    try {
      if (!coupleData?.id) return;
      
      setLoading(true);
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
      toast({
        title: "Error",
        description: "Failed to fetch planned dates. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (dateData?: any) => {
    const dataToAdd = dateData || formData;
    
    console.log('Add Date clicked - Data to add:', dataToAdd);
    console.log('Form data state:', formData);
    console.log('DateData parameter:', dateData);
    console.log('Title from dataToAdd:', dataToAdd.title);
    console.log('Title trimmed:', dataToAdd.title?.trim());
    console.log('Title check result:', !!dataToAdd.title?.trim());
    console.log('Couple data:', !!coupleData);
    console.log('User data:', !!user);
    
    // More specific validation - only title is required
    const titleValue = dataToAdd.title;
    if (!titleValue || titleValue.trim() === '') {
      console.error('Validation failed: Missing title', { titleValue, trimmed: titleValue?.trim() });
      toast({
        title: "Missing Information",
        description: "Please enter a title for your date."
      });
      return;
    }

    if (!coupleData) {
      console.error('Validation failed: No couple data');
      toast({
        title: "Setup Required",
        description: "Please set up your partnership first."
      });
      return;
    }

    if (!user) {
      console.error('Validation failed: No user');
      toast({
        title: "Authentication Required",
        description: "Please log in to add dates."
      });
      return;
    }

    try {
      console.log('Attempting to insert date idea...');
      
      const { data, error } = await supabase
        .from('date_ideas')
        .insert({
          couple_id: coupleData.id,
          created_by: user.id,
          title: dataToAdd.title.trim(),
          description: dataToAdd.description?.trim() || null,
          category: dataToAdd.category || 'romantic',
          scheduled_date: dataToAdd.scheduled_date || null,
          scheduled_time: dataToAdd.scheduled_time || null,
          location: dataToAdd.location?.trim() || null,
          estimated_cost: dataToAdd.estimated_cost?.trim() || null,
          estimated_duration: dataToAdd.estimated_duration?.trim() || null,
          notes: dataToAdd.notes?.trim() || null
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Successfully added date:', data);
      setPlannedDates(prev => [data, ...prev]);
      
      if (!dateData) {
        // Only reset form if this was from the manual form
        setFormData({
          title: '',
          description: '',
          category: 'romantic',
          scheduled_date: '',
          scheduled_time: '',
          location: '',
          estimated_cost: '',
          estimated_duration: '',
          notes: ''
        });
        setShowAddForm(false);
      }

      toast({
        title: "Date added! 💕",
        description: `${dataToAdd.title} has been added to your planner.`
      });
    } catch (error) {
      console.error('Error adding date:', error);
      toast({
        title: "Error",
        description: "Failed to add date. Please try again."
      });
    }
  };

  const handleEditDate = (date: DateIdea) => {
    setEditingDate(date);
    setEditFormData({
      title: date.title,
      description: date.description || '',
      category: date.category || 'romantic',
      scheduled_date: date.scheduled_date || '',
      scheduled_time: date.scheduled_time || '',
      location: date.location || '',
      estimated_cost: date.estimated_cost || '',
      estimated_duration: date.estimated_duration || '',
      notes: date.notes || ''
    });
  };

  const handleUpdateEvent = async () => {
    if (!editingDate || !editFormData.title) {
      toast({
        title: "Missing Information",
        description: "Please fill in the required fields."
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('date_ideas')
        .update(editFormData)
        .eq('id', editingDate.id)
        .select()
        .single();

      if (error) throw error;

      setPlannedDates(prev => 
        prev.map(date => date.id === editingDate.id ? data : date)
      );
      setEditingDate(null);

      toast({
        title: "Date updated! 💕",
        description: `${editFormData.title} has been updated.`
      });
    } catch (error) {
      console.error('Error updating date:', error);
      toast({
        title: "Error",
        description: "Failed to update date. Please try again."
      });
    }
  };

  const handleDateFeedback = async (dateId: string, wasSuccessful: boolean) => {
    if (wasSuccessful) {
      try {
        const { error } = await supabase
          .from('date_ideas')
          .update({
            is_completed: true,
            completed_date: new Date().toISOString().split('T')[0],
            rating: 5
          })
          .eq('id', dateId);

        if (error) throw error;

        // Update local state to remove completed date
        setPlannedDates(prev => prev.filter(date => date.id !== dateId));

        toast({
          title: "Great! Date added to history 💕",
          description: "Your successful date has been added to your date history in the profile tab."
        });
      } catch (error) {
        console.error('Error updating date feedback:', error);
        toast({
          title: "Error",
          description: "Failed to update date. Please try again."
        });
      }
    } else {
      // Show options for unsuccessful date
      setDeleteConfirm(dateId);
    }
  };

  const handleDeleteDate = async (dateId: string) => {
    if (!dateId) {
      console.error('No dateId provided for deletion');
      return;
    }

    console.log('Attempting to delete date with ID:', dateId);
    
    try {
      // First verify the date exists and user has permission
      const { data: existingDate, error: fetchError } = await supabase
        .from('date_ideas')
        .select('*')
        .eq('id', dateId)
        .single();

      if (fetchError) {
        console.error('Error fetching date to delete:', fetchError);
        throw new Error('Date not found or access denied');
      }

      if (!existingDate) {
        console.error('Date not found:', dateId);
        toast({
          title: "Error",
          description: "Date not found or already deleted.",
          variant: "destructive"
        });
        return;
      }

      console.log('Found date to delete:', existingDate);

      // Perform the deletion
      const { error: deleteError } = await supabase
        .from('date_ideas')
        .delete()
        .eq('id', dateId);

      if (deleteError) {
        console.error('Database deletion error:', deleteError);
        throw deleteError;
      }

      console.log('Date successfully deleted from database:', dateId);

      // The real-time subscription will handle updating the UI
      // But also update local state immediately for better UX
      setPlannedDates(prev => prev.filter(date => date.id !== dateId));
      setDeleteConfirm(null);

      toast({
        title: "Date removed",
        description: "The date has been permanently removed from your planner."
      });
    } catch (error) {
      console.error('Error deleting date:', error);
      toast({
        title: "Error",
        description: "Failed to delete the date. Please try again.",
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


  // Show loading while couple data is being fetched
  if (coupleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Show message if user doesn't have a couple setup
  if (!coupleData) {
    return (
      <div className="min-h-screen bg-background flex flex-col pb-20">
        <GradientHeader 
          title="Date Planner" 
          subtitle="Because love needs some beautiful plans" 
          icon={<Heart size={24} />} 
          showBackButton={false}
        />
        <div className="flex-1 flex items-center justify-center container mx-auto px-4">
          <div className="text-center space-y-4">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Connect with Your Partner</h2>
            <p className="text-muted-foreground max-w-md">
              To start planning dates together, you'll need to connect with your partner first.
            </p>
            <Button onClick={() => navigate('/profile')} className="mt-4">
              Set Up Partnership
            </Button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  // Show loading while dates are being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">Loading your dates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Gradient Header */}
      <GradientHeader 
        title="Date Planner" 
        subtitle="Plan your perfect dates together" 
        icon={<Heart size={24} />} 
        showBackButton={false}
      />

      <div className="flex-1 overflow-y-auto container mx-auto px-4 py-6">
        <div className="w-full">
          <Tabs defaultValue="planned" className="w-full">
            <TabsList className="grid grid-cols-3 gap-2 mb-6">
              <TabsTrigger value="planned" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Planned Dates
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Sweet Suggestions
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Local Events
              </TabsTrigger>
            </TabsList>

            <TabsContent value="planned" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Your Planned Dates</h3>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Date
                </Button>
              </div>

            {/* Add Form */}
            {showAddForm && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Add New Date</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Title *</label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Dinner at..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50">
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Date</label>
                      <Input
                        type="date"
                        value={formData.scheduled_date}
                        onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Time</label>
                      <Input
                        type="time"
                        value={formData.scheduled_time}
                        onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Location</label>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Restaurant, park, etc."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Estimated Cost</label>
                      <Input
                        value={formData.estimated_cost}
                        onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                        placeholder="$50"
                      />
                     </div>
                     <div>
                       <label className="text-sm font-medium">Duration</label>
                       <Input
                         value={formData.estimated_duration}
                         onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                         placeholder="2 hours"
                       />
                     </div>
                   </div>
                   <div>
                     <label className="text-sm font-medium">Description</label>
                     <Textarea
                       value={formData.description}
                       onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                       placeholder="Describe your date idea..."
                       className="min-h-[80px]"
                     />
                   </div>
                   <div>
                     <label className="text-sm font-medium">Notes</label>
                     <Textarea
                       value={formData.notes}
                       onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                       placeholder="Any special notes or reminders..."
                       className="min-h-[60px]"
                     />
                   </div>
                   <div className="flex gap-2">
                     <Button onClick={handleAddEvent} className="flex-1">
                       <Plus className="h-4 w-4 mr-2" />
                       Add Date
                     </Button>
                     <Button variant="outline" onClick={() => setShowAddForm(false)}>
                       Cancel
                     </Button>
                   </div>
                 </CardContent>
               </Card>
             )}

             {/* Edit Form */}
             {editingDate && (
               <Card>
                 <CardHeader>
                   <div className="flex justify-between items-center">
                     <CardTitle>Edit Date</CardTitle>
                     <Button variant="ghost" size="sm" onClick={() => setEditingDate(null)}>
                       <X className="h-4 w-4" />
                     </Button>
                   </div>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="text-sm font-medium">Title *</label>
                       <Input
                         value={editFormData.title}
                         onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                         placeholder="Dinner at..."
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">Category</label>
                       <Select value={editFormData.category} onValueChange={(value) => setEditFormData({ ...editFormData, category: value })}>
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent className="bg-background border z-50">
                           {categories.map(cat => (
                             <SelectItem key={cat} value={cat}>
                               {cat.charAt(0).toUpperCase() + cat.slice(1)}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                     <div>
                       <label className="text-sm font-medium">Date</label>
                       <Input
                         type="date"
                         value={editFormData.scheduled_date}
                         onChange={(e) => setEditFormData({ ...editFormData, scheduled_date: e.target.value })}
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">Time</label>
                       <Input
                         type="time"
                         value={editFormData.scheduled_time}
                         onChange={(e) => setEditFormData({ ...editFormData, scheduled_time: e.target.value })}
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">Location</label>
                       <Input
                         value={editFormData.location}
                         onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                         placeholder="Restaurant, park, etc."
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">Estimated Cost</label>
                       <Input
                         value={editFormData.estimated_cost}
                         onChange={(e) => setEditFormData({ ...editFormData, estimated_cost: e.target.value })}
                         placeholder="$50"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">Duration</label>
                       <Input
                         value={editFormData.estimated_duration}
                         onChange={(e) => setEditFormData({ ...editFormData, estimated_duration: e.target.value })}
                         placeholder="2 hours"
                       />
                     </div>
                   </div>
                   <div>
                     <label className="text-sm font-medium">Description</label>
                     <Textarea
                       value={editFormData.description}
                       onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                       placeholder="Describe your date idea..."
                       className="min-h-[80px]"
                     />
                   </div>
                   <div>
                     <label className="text-sm font-medium">Notes</label>
                     <Textarea
                       value={editFormData.notes}
                       onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                       placeholder="Any special notes or reminders..."
                       className="min-h-[60px]"
                     />
                   </div>
                   <div className="flex gap-2">
                     <Button onClick={handleUpdateEvent} className="flex-1">
                       Update Date
                     </Button>
                     <Button variant="outline" onClick={() => setEditingDate(null)}>
                       Cancel
                     </Button>
                   </div>
                 </CardContent>
               </Card>
             )}

             {/* Planned Dates List */}
             {plannedDates.length === 0 ? (
               <Card>
                 <CardContent className="text-center py-12">
                   <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                   <h3 className="text-lg font-semibold mb-2">No dates planned yet</h3>
                   <p className="text-muted-foreground mb-4">
                     Start planning your perfect dates together! Add your first date idea above or explore event suggestions.
                   </p>
                 </CardContent>
               </Card>
             ) : (
               <div className="grid gap-4">
                 {Object.entries(getDatesByCategory()).map(([category, dates]) => (
                   <div key={category} className="space-y-3">
                     <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                       {category.charAt(0).toUpperCase() + category.slice(1)} ({dates.length})
                     </h4>
                     {dates.map(date => (
                       <Card key={date.id} className="group hover:shadow-md transition-shadow">
                         <CardContent className="p-4">
                           <div className="flex justify-between items-start mb-3">
                             <div>
                               <h3 className="font-semibold text-lg mb-1">{date.title}</h3>
                               <Badge variant="outline" className="text-xs">
                                 {date.category?.charAt(0).toUpperCase() + date.category?.slice(1)}
                               </Badge>
                             </div>
                             <div className="flex gap-1">
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 onClick={() => handleEditDate(date)}
                                 className="h-8 w-8 p-0"
                               >
                                 ✏️
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 onClick={() => setDeleteConfirm(date.id)}
                                 className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </div>
                           </div>

                           {date.description && (
                             <p className="text-muted-foreground mb-3 text-sm">{date.description}</p>
                           )}

                           <div className="grid grid-cols-2 gap-3 text-sm">
                             {date.scheduled_date && (
                               <div className="flex items-center gap-2">
                                 <Calendar className="h-4 w-4 text-muted-foreground" />
                                 <span>{new Date(date.scheduled_date).toLocaleDateString()}</span>
                                 {date.scheduled_time && (
                                   <span className="text-muted-foreground">at {date.scheduled_time}</span>
                                 )}
                               </div>
                             )}
                             
                             {date.location && (
                               <div className="flex items-center gap-2">
                                 <MapPin className="h-4 w-4 text-muted-foreground" />
                                 <span className="truncate">{date.location}</span>
                               </div>
                             )}
                             
                             {date.estimated_cost && (
                               <div className="flex items-center gap-2">
                                 <DollarSign className="h-4 w-4 text-muted-foreground" />
                                 <span>{date.estimated_cost}</span>
                               </div>
                             )}
                             
                             {date.estimated_duration && (
                               <div className="flex items-center gap-2">
                                 <Clock className="h-4 w-4 text-muted-foreground" />
                                 <span>{date.estimated_duration}</span>
                               </div>
                             )}
                           </div>

                           {date.notes && (
                             <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                               <p className="text-sm text-muted-foreground">{date.notes}</p>
                             </div>
                           )}

                           {/* Date Action Buttons */}
                           <div className="flex gap-2 mt-4">
                             <Button 
                               size="sm" 
                               variant="outline"
                               onClick={() => handleDateFeedback(date.id, true)}
                               className="flex-1"
                             >
                               ✅ We did this!
                             </Button>
                             <Button 
                               size="sm" 
                               variant="outline"
                               onClick={() => handleDateFeedback(date.id, false)}
                               className="flex-1"
                             >
                               ❌ Skip this
                             </Button>
                           </div>
                         </CardContent>
                       </Card>
                     ))}
                   </div>
                 ))}
               </div>
                )}
            </TabsContent>

            <TabsContent value="events" className="space-y-6">
              <EventDiscovery 
                coupleId={coupleId || ''}
                userId={user?.id || ''}
                onAddToDatePlan={handleAddEvent}
              />
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-6">
              <SweetSuggestions 
                coupleId={coupleId || ''}
                userId={user?.id || ''}
                onAddToDatePlan={handleAddEvent}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

        {/* Delete Confirmation Dialog */}
       <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Remove Date Plan</AlertDialogTitle>
             <AlertDialogDescription>
               Are you sure you want to remove this date from your planner? This action cannot be undone.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancel</AlertDialogCancel>
             <AlertDialogAction 
               onClick={() => deleteConfirm && handleDeleteDate(deleteConfirm)}
               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
             >
               Remove Date
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

       <BottomNavigation />
     </div>
   );
 };
