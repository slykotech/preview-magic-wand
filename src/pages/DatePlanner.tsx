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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, MapPin, Clock, DollarSign, Heart, X, Plus, Trash2 } from 'lucide-react';
import { GradientHeader } from '@/components/GradientHeader';

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
  const { coupleData } = useCoupleData();
  const { toast } = useToast();
  
  const [plannedDates, setPlannedDates] = useState<DateIdea[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDate, setEditingDate] = useState<DateIdea | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleAddEvent = async () => {
    if (!formData.title || !coupleData || !user) {
      toast({
        title: "Missing Information",
        description: "Please fill in the required fields."
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('date_ideas')
        .insert({
          couple_id: coupleData.id,
          created_by: user.id,
          ...formData
        })
        .select()
        .single();

      if (error) throw error;

      setPlannedDates(prev => [data, ...prev]);
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

      toast({
        title: "Date added! 💕",
        description: `${formData.title} has been added to your planner.`
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">Loading...</div>
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
        <div className="space-y-6">
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
                      <SelectContent>
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
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your date idea..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddEvent}>
                    Add Date
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dates List */}
          {plannedDates.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold text-lg mb-2">No planned dates yet</h3>
                <p className="text-muted-foreground mb-4">Start planning your perfect dates together!</p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Plan Your First Date
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(getDatesByCategory()).map(([category, dates]) => (
                <div key={category} className="space-y-3">
                  <h4 className="font-medium text-lg flex items-center gap-2">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                    <Badge variant="secondary">{dates.length}</Badge>
                  </h4>
                  <div className="grid gap-3">
                    {dates.map((date) => (
                      <Card key={date.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h5 className="font-medium text-lg">{date.title}</h5>
                              {date.description && (
                                <p className="text-muted-foreground text-sm mt-1">{date.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEditDate(date)}>
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDate(date.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                            {date.scheduled_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(date.scheduled_date).toLocaleDateString()}
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
                            {date.estimated_cost && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {date.estimated_cost}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Form Modal */}
        {editingDate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Edit Date</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setEditingDate(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={editFormData.category} onValueChange={(value) => setEditFormData({ ...editFormData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditingDate(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateEvent}>
                    Update Date
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Date</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this date? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteDate(deleteConfirm)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};