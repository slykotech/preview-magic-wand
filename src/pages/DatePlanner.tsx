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
import { CalendarIcon, MapPin, Clock, Heart, Star, CalendarPlus, Edit, Calendar as CalendarClock, Plus, Sparkles, Music, Save, X, Trash2 } from "lucide-react";
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
interface UpcomingEvent {
  id: string;
  title: string;
  distance: string;
  timing: string;
  description: string;
  category: string;
  venue?: string;
  city?: string;
  price?: string;
  image?: string;
  bookingUrl?: string;
  date?: string;
  time?: string;
}
export const DatePlanner = () => {
  const [activeTab, setActiveTab] = useState<'planned' | 'upcoming'>('planned');
  const [plannedDates, setPlannedDates] = useState<DateIdea[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedUpcomingEvent, setSelectedUpcomingEvent] = useState<UpcomingEvent | null>(null);
  const [editingDate, setEditingDate] = useState<DateIdea | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dateToDelete, setDateToDelete] = useState<DateIdea | null>(null);
  const [showUnsuccessfulOptions, setShowUnsuccessfulOptions] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    date: undefined as Date | undefined,
    time: '',
    category: 'romantic'
  });
  const [scheduleData, setScheduleData] = useState({
    date: undefined as Date | undefined,
    time: ''
  });
  const [editEvent, setEditEvent] = useState({
    title: '',
    description: '',
    location: '',
    date: undefined as Date | undefined,
    time: '',
    category: 'romantic'
  });
  const {
    toast
  } = useToast();
  const {
    user,
    loading: authLoading
  } = useAuth();
  const {
    coupleData
  } = useCoupleData();
  const navigate = useNavigate();
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user && coupleData?.id) {
      fetchPlannedDates();
      getUserLocation();
    }
  }, [user, authLoading, navigate, coupleData?.id]);

  useEffect(() => {
    if (userLocation) {
      fetchUpcomingEvents();
    }
  }, [userLocation]);
  const fetchPlannedDates = async () => {
    try {
      if (!coupleData?.id) return;
      const {
        data,
        error
      } = await supabase
        .from('date_ideas')
        .select('*')
        .eq('couple_id', coupleData.id)
        .not('scheduled_date', 'is', null)
        .eq('is_completed', false)
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      setPlannedDates(data || []);
    } catch (error) {
      console.error('Error fetching planned dates:', error);
    } finally {
      setLoading(false);
    }
  };
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Fallback to a default location (e.g., city center)
          setUserLocation({
            latitude: 40.7128, // Default to NYC
            longitude: -74.0060
          });
        }
      );
    } else {
      // Fallback for browsers without geolocation
      setUserLocation({
        latitude: 40.7128,
        longitude: -74.0060
      });
    }
  };

  const fetchUpcomingEvents = async () => {
    if (!userLocation) return;
    
    setEventsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-events', {
        body: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radius: 25, // 25km radius
          size: 20 // Get 20 events
        }
      });

      if (error) {
        console.error('Error fetching events:', error);
        // Fall back to mock events if API fails
        setUpcomingEvents(getMockEvents());
        return;
      }

      setUpcomingEvents(data.events || []);
    } catch (error) {
      console.error('Error in fetchUpcomingEvents:', error);
      // Fall back to mock events if there's an error
      setUpcomingEvents(getMockEvents());
    } finally {
      setEventsLoading(false);
    }
  };

  const getMockEvents = (): UpcomingEvent[] => [
    {
      id: '1',
      title: 'Jazz Under the Stars 🎷',
      distance: '3 km away',
      timing: 'Friday, 8:30 PM',
      description: 'Feel the rhythm of love as you sway under moonlight and melody.',
      category: 'Music',
      venue: 'Central Park',
      price: 'From $25'
    },
    {
      id: '2', 
      title: 'Candlelit Wine Tasting 🍷',
      distance: '1.2 km away',
      timing: 'Saturday, 7:00 PM',
      description: 'Discover new flavors together in an intimate candlelit setting.',
      category: 'Food & Drink',
      venue: 'Wine & Dine',
      price: 'From $45'
    },
    {
      id: '3',
      title: 'Moonlight Art Gallery 🎨',
      distance: '5 km away', 
      timing: 'Sunday, 6:00 PM',
      description: 'Explore beautiful art pieces while sharing whispered conversations.',
      category: 'Culture',
      venue: 'Modern Art Museum',
      price: 'From $15'
    }
  ];
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
      const {
        error
      } = await supabase.from('date_ideas').insert({
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
  const handleScheduleUpcomingEvent = (event: UpcomingEvent) => {
    setSelectedUpcomingEvent(event);
    setScheduleData({
      date: undefined,
      time: ''
    });
    setShowScheduleForm(true);
  };
  const handleConfirmSchedule = async () => {
    if (!selectedUpcomingEvent || !scheduleData.date || !scheduleData.time || !coupleData?.id) {
      toast({
        title: "Missing details! ⏰",
        description: "Please select both date and time",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('date_ideas').insert({
        title: selectedUpcomingEvent.title,
        description: selectedUpcomingEvent.description,
        category: selectedUpcomingEvent.category,
        couple_id: coupleData.id,
        created_by: user?.id,
        location: 'TBD',
        scheduled_date: scheduleData.date.toISOString().split('T')[0],
        scheduled_time: scheduleData.time,
        is_completed: false
      });
      if (error) throw error;
      toast({
        title: "Date scheduled! 💕",
        description: `${selectedUpcomingEvent.title} has been added to your planned dates`
      });
      setShowScheduleForm(false);
      setSelectedUpcomingEvent(null);
      fetchPlannedDates();
      setActiveTab('planned'); // Switch to planned tab to show the new event
    } catch (error) {
      console.error('Error scheduling event:', error);
      toast({
        title: "Error scheduling event",
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
      const {
        error
      } = await supabase.from('date_ideas').update({
        title: editEvent.title,
        description: editEvent.description,
        location: editEvent.location,
        category: editEvent.category,
        scheduled_date: editEvent.date.toISOString().split('T')[0],
        scheduled_time: editEvent.time
      }).eq('id', editingDate.id);
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
  const handleSaveUpcomingEvent = async (event: UpcomingEvent) => {
    if (!coupleData?.id) return;
    try {
      const {
        error
      } = await supabase.from('date_ideas').insert({
        title: event.title,
        description: event.description,
        category: event.category,
        couple_id: coupleData.id,
        created_by: user?.id,
        location: 'TBD',
        is_completed: false
      });
      if (error) throw error;
      toast({
        title: "Event saved! ✨",
        description: `${event.title} has been saved to your ideas`
      });
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: "Error saving event",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };
  const handleDateFeedback = async (dateId: string, wasSuccessful: boolean) => {
    if (wasSuccessful) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const {
          error
        } = await supabase.from('date_ideas').update({
          is_completed: true,
          completed_date: today,
          rating: 5,
          notes: 'Date was successful!',
          updated_at: new Date().toISOString()
        }).eq('id', dateId);
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
      // Show options for unsuccessful dates
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
        title: "Date deleted",
        description: `${dateToDelete.title} has been removed from your planner.`
      });
      
      fetchPlannedDates();
    } catch (error) {
      console.error('Error deleting date:', error);
      toast({
        title: "Error deleting date",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setShowDeleteConfirm(false);
      setDateToDelete(null);
    }
  };
  const isDateCompleted = (scheduledDate: string) => {
    const today = new Date();
    const dateToCheck = new Date(scheduledDate);
    return dateToCheck < today;
  };
  return <div className="min-h-screen bg-background pb-20">
      {/* Gradient Header */}
      <GradientHeader title="Date Planner" subtitle="Because love deserves beautiful plans" icon={<Heart size={24} />} showBackButton={false}>
        {/* Enhanced Tab Navigation */}
        <Tabs value={activeTab} onValueChange={value => setActiveTab(value as 'planned' | 'upcoming')} className="w-full">
          <TabsList className="grid w-auto grid-cols-2 gap-2 max-w-sm mx-auto">
            <TabsTrigger value="planned" className="flex-col gap-1">
              <span className="font-bold">Planned</span>
              <span className="text-xs opacity-80">Scheduled love moments</span>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex-col gap-1">
              <span className="font-bold">Upcoming</span>
              <span className="text-xs opacity-80">Sweet surprises nearby</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </GradientHeader>

      {/* Content with Tab System */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={value => setActiveTab(value as 'planned' | 'upcoming')} className="w-full">
          <TabsContent value="planned" className="space-y-4">
            {/* Add Event Button */}
            <div className="flex justify-center">
              <Button onClick={() => setShowAddForm(true)} className="bg-gradient-secondary hover:opacity-90 text-white px-6 py-2" size="sm">
                <Plus size={16} className="mr-2" />
                Add Your Own Date
              </Button>
            </div>

            {/* Planned Events */}
            {loading ? <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground font-bold">Loading your planned dates...</p>
              </div> : plannedDates.length === 0 ? <div className="text-center py-12">
                <CalendarClock className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-bold text-muted-foreground">
                  Nothing on the calendar yet. Go make some magic!
                </p>
              </div> : plannedDates.map((date, index) => <div key={date.id} className="bg-card rounded-2xl p-6 shadow-soft hover:shadow-romantic transition-all duration-200 transform hover:scale-102 animate-fade-in" style={{
            animationDelay: `${index * 100}ms`
          }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-extrabold font-poppins text-foreground mb-2">
                        {date.title} 
                        {date.category === 'romantic' && ' 🍷'}
                        {date.category === 'adventure' && ' 🌟'}
                        {date.category === 'relaxing' && ' 🌸'}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarIcon size={16} />
                          <span className="font-bold">
                            {date.scheduled_date && format(new Date(date.scheduled_date), "EEEE, MMM d")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={16} />
                          <span className="font-bold">{date.scheduled_time}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-red-50 text-red-600 border-red-200">
                      <Heart size={12} className="mr-1" />
                      Planned Together
                    </Badge>
                  </div>
                  
                  {date.description && <p className="text-muted-foreground font-inter mb-4 leading-relaxed">
                      {date.description}
                    </p>}
                  
                  <div className="flex gap-2">
                     <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditDate(date)}>
                       <Edit size={14} className="mr-1" />
                       Edit
                     </Button>
                    {date.scheduled_date && isDateCompleted(date.scheduled_date) && (
                      <div className="flex gap-1 flex-1">
                        <Button variant="outline" size="sm" className="flex-1 bg-green-50 text-green-600 border-green-200 hover:bg-green-100" onClick={() => handleDateFeedback(date.id, true)}>
                          <Heart size={14} className="mr-1" />
                          Successful
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 bg-red-50 text-red-600 border-red-200 hover:bg-red-100" onClick={() => handleDateFeedback(date.id, false)}>
                          <X size={14} className="mr-1" />
                          Not Great
                        </Button>
                      </div>
                    )}
                  </div>
                </div>)}
          </TabsContent>
          
          <TabsContent value="upcoming" className="space-y-4">
            {/* Upcoming Events */}
            {eventsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground font-bold">Finding romantic events near you...</p>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-bold text-muted-foreground">
                  No events found nearby. Try again later!
                </p>
              </div>
            ) : (
              upcomingEvents.map((event, index) => (
                <div 
                  key={event.id} 
                  className="bg-card rounded-2xl p-6 shadow-soft hover:shadow-romantic transition-all duration-200 transform hover:scale-102 animate-fade-in" 
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-extrabold font-poppins text-foreground mb-2">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <MapPin size={16} />
                          <span className="font-bold">{event.distance}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={16} />
                          <span className="font-bold">{event.timing}</span>
                        </div>
                      </div>
                      {event.venue && (
                        <p className="text-sm text-muted-foreground mb-1">
                          📍 {event.venue} {event.city && `• ${event.city}`}
                        </p>
                      )}
                      {event.price && (
                        <p className="text-sm font-bold text-green-600 mb-2">
                          💰 {event.price}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-purple-50 text-purple-600 border-purple-200">
                      <Sparkles size={12} className="mr-1" />
                      {event.category}
                    </Badge>
                  </div>
                  
                  <p className="text-muted-foreground font-inter mb-4 leading-relaxed">
                    {event.description}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1" 
                      onClick={() => handleSaveUpcomingEvent(event)}
                    >
                      <Save size={14} className="mr-1" />
                      Save Idea
                    </Button>
                    <Button 
                      className="bg-gradient-secondary hover:opacity-90 text-white flex-1" 
                      size="sm"
                      onClick={() => handleScheduleUpcomingEvent(event)}
                    >
                      <CalendarPlus size={14} className="mr-1" />
                      Schedule
                    </Button>
                    {event.bookingUrl && (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(event.bookingUrl, '_blank')}
                      >
                        Book Now
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Event Form Modal */}
      {showAddForm && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-romantic animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold font-poppins">Add Your Own Date</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                <X size={20} />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title*</Label>
                <Input id="title" value={newEvent.title} onChange={e => setNewEvent({
              ...newEvent,
              title: e.target.value
            })} placeholder="e.g., Candlelight Dinner" className="mt-1" />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={newEvent.description} onChange={e => setNewEvent({
              ...newEvent,
              description: e.target.value
            })} placeholder="What makes this date special?" className="mt-1" rows={3} />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={newEvent.location} onChange={e => setNewEvent({
              ...newEvent,
              location: e.target.value
            })} placeholder="Where will this happen?" className="mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date*</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newEvent.date ? format(newEvent.date, "MMM d, yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={newEvent.date} onSelect={date => setNewEvent({
                    ...newEvent,
                    date
                  })} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="time">Time*</Label>
                  <Input id="time" type="time" value={newEvent.time} onChange={e => setNewEvent({
                ...newEvent,
                time: e.target.value
              })} className="mt-1" />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleAddEvent} className="flex-1 bg-gradient-secondary hover:opacity-90 text-white">
                  <Save size={16} className="mr-2" />
                  Add Date
                </Button>
              </div>
            </div>
          </div>
        </div>}

      {/* Schedule Event Modal */}
      {showScheduleForm && selectedUpcomingEvent && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-romantic animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold font-poppins">Schedule Date</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowScheduleForm(false)}>
                <X size={20} />
              </Button>
            </div>

            <div className="mb-6 p-4 bg-muted/20 rounded-lg">
              <h4 className="font-bold text-lg mb-2">{selectedUpcomingEvent.title}</h4>
              <p className="text-muted-foreground text-sm">{selectedUpcomingEvent.description}</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date*</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduleData.date ? format(scheduleData.date, "MMM d, yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={scheduleData.date} onSelect={date => setScheduleData({
                    ...scheduleData,
                    date
                  })} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="schedule-time">Time*</Label>
                  <Input id="schedule-time" type="time" value={scheduleData.time} onChange={e => setScheduleData({
                ...scheduleData,
                time: e.target.value
              })} className="mt-1" />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowScheduleForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleConfirmSchedule} className="flex-1 bg-gradient-secondary hover:opacity-90 text-white">
                  <CalendarPlus size={16} className="mr-2" />
                  Schedule Date
                </Button>
              </div>
            </div>
          </div>
        </div>}

      {/* Edit Event Modal */}
      {showEditForm && editingDate && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-romantic animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold font-poppins">Edit Date</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowEditForm(false)}>
                <X size={20} />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Event Title*</Label>
                <Input id="edit-title" value={editEvent.title} onChange={e => setEditEvent({
              ...editEvent,
              title: e.target.value
            })} placeholder="e.g., Candlelight Dinner" className="mt-1" />
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" value={editEvent.description} onChange={e => setEditEvent({
              ...editEvent,
              description: e.target.value
            })} placeholder="What makes this date special?" className="mt-1" rows={3} />
              </div>

              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input id="edit-location" value={editEvent.location} onChange={e => setEditEvent({
              ...editEvent,
              location: e.target.value
            })} placeholder="Where will this happen?" className="mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date*</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editEvent.date ? format(editEvent.date, "MMM d, yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={editEvent.date} onSelect={date => setEditEvent({
                    ...editEvent,
                    date
                  })} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="edit-time">Time*</Label>
                  <Input id="edit-time" type="time" value={editEvent.time} onChange={e => setEditEvent({
                ...editEvent,
                time: e.target.value
              })} className="mt-1" />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleUpdateEvent} className="flex-1 bg-gradient-secondary hover:opacity-90 text-white">
                  <Save size={16} className="mr-2" />
                  Update Date
                </Button>
              </div>
            </div>
          </div>
        </div>}

      {/* Unsuccessful Date Options Modal */}
      {showUnsuccessfulOptions && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-romantic animate-slide-up">
            <div className="text-center mb-6">
              <h3 className="text-xl font-extrabold font-poppins mb-2">Date didn't go as planned?</h3>
              <p className="text-muted-foreground">No worries! What would you like to do?</p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => handleUnsuccessfulAction(showUnsuccessfulOptions, 'reschedule')}
                className="w-full bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
                variant="outline"
              >
                <CalendarIcon size={16} className="mr-2" />
                Reschedule for another time
              </Button>
              
              <Button 
                onClick={() => handleUnsuccessfulAction(showUnsuccessfulOptions, 'delete')}
                className="w-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                variant="outline"
              >
                <Trash2 size={16} className="mr-2" />
                Remove from planner
              </Button>
              
              <Button 
                onClick={() => setShowUnsuccessfulOptions(null)}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Date"
        description={`Are you sure you want to delete "${dateToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteDate}
        variant="destructive"
      />

      <BottomNavigation />
    </div>;
};