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
import { CalendarIcon, MapPin, Clock, Heart, Star, CalendarPlus, Edit, Calendar as CalendarClock, Plus, Sparkles, Music, Save, X } from "lucide-react";
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
}
export const DatePlanner = () => {
  const [activeTab, setActiveTab] = useState<'planned' | 'upcoming'>('planned');
  const [plannedDates, setPlannedDates] = useState<DateIdea[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
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
    if (user) {
      fetchPlannedDates();
      fetchUpcomingEvents();
    }
  }, [user, authLoading, navigate]);
  const fetchPlannedDates = async () => {
    try {
      if (!coupleData?.id) return;
      const {
        data,
        error
      } = await supabase.from('date_ideas').select('*').eq('couple_id', coupleData.id).not('scheduled_date', 'is', null).order('scheduled_date', {
        ascending: true
      });
      if (error) throw error;
      setPlannedDates(data || []);
    } catch (error) {
      console.error('Error fetching planned dates:', error);
    } finally {
      setLoading(false);
    }
  };
  const fetchUpcomingEvents = async () => {
    // Mock upcoming events for now - in a real app this would come from external APIs
    const mockEvents: UpcomingEvent[] = [{
      id: '1',
      title: 'Jazz Under the Stars 🎷',
      distance: '3 km away',
      timing: 'Friday, 8:30 PM',
      description: 'Feel the rhythm of love as you sway under moonlight and melody.',
      category: 'Music'
    }, {
      id: '2',
      title: 'Candlelit Wine Tasting 🍷',
      distance: '1.2 km away',
      timing: 'Saturday, 7:00 PM',
      description: 'Discover new flavors together in an intimate candlelit setting.',
      category: 'Food & Drink'
    }, {
      id: '3',
      title: 'Moonlight Art Gallery 🎨',
      distance: '5 km away',
      timing: 'Sunday, 6:00 PM',
      description: 'Explore beautiful art pieces while sharing whispered conversations.',
      category: 'Culture'
    }];
    setUpcomingEvents(mockEvents);
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
  return <div className="min-h-screen bg-background pb-20">
      {/* Gradient Header */}
      <GradientHeader
        title="Date Planner"
        subtitle="Because love deserves beautiful plans"
        icon={<Heart size={24} />}
        showBackButton={false}
      >
        {/* Enhanced Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'planned' | 'upcoming')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="planned" className="flex-col gap-1">
              <span className="font-bold">Planned</span>
              <span className="text-xs opacity-80">Your scheduled love moments</span>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex-col gap-1">
              <span className="font-bold">Upcoming</span>
              <span className="text-xs opacity-80">Sweet surprises nearby</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </GradientHeader>

      {/* Content with Tab System */}
      <div className="px-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'planned' | 'upcoming')} className="w-full">
          <TabsContent value="planned" className="space-y-4">
            {/* Add Event Button */}
            <Button onClick={() => setShowAddForm(true)} className="w-full bg-gradient-secondary hover:opacity-90 text-white py-3" size="lg">
              <Plus size={20} className="mr-2" />
              Add Your Own Date
            </Button>

            {/* Planned Events */}
            {loading ? <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground font-bold">Loading your planned dates...</p>
              </div> : plannedDates.length === 0 ? <div className="text-center py-12">
                <CalendarClock className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-bold text-muted-foreground">
                  Nothing on the calendar yet — go make some magic!
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
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit size={14} className="mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarIcon size={14} className="mr-1" />
                      Reschedule
                    </Button>
                  </div>
                </div>)}
          </TabsContent>
          
          <TabsContent value="upcoming" className="space-y-4">
            {/* Upcoming Events */}
            {upcomingEvents.length === 0 ? <div className="text-center py-12">
                <Sparkles className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-bold text-muted-foreground">
                  We're searching the city for your next romantic moment...
                </p>
              </div> : upcomingEvents.map((event, index) => <div key={event.id} className="bg-card rounded-2xl p-6 shadow-soft hover:shadow-romantic transition-all duration-200 transform hover:scale-102 animate-fade-in" style={{
          animationDelay: `${index * 100}ms`
        }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-extrabold font-poppins text-foreground mb-2">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin size={16} />
                          <span className="font-bold">{event.distance}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={16} />
                          <span className="font-bold">{event.timing}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                      {event.category}
                    </Badge>
                  </div>
                  
                  <p className="text-muted-foreground font-inter mb-4 leading-relaxed italic">
                    {event.description}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button variant="romantic" size="sm" className="flex-1" onClick={() => handleSaveUpcomingEvent(event)}>
                      <CalendarPlus size={14} className="mr-1" />
                      Add to Planner
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Heart size={14} className="mr-1" />
                      Save for Later
                    </Button>
                  </div>
                </div>)}
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

      <BottomNavigation />
    </div>;
};