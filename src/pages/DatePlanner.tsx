import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Calendar, MapPin, Clock, DollarSign, Heart, Star, CalendarPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import dateActivitiesImage from "@/assets/date-activities.jpg";

interface DateIdea {
  id: string;
  title: string;
  description: string;
  category: string;
  duration_hours?: number;
  estimated_cost?: string;
  location_type?: string;
  is_public?: boolean;
  created_by?: string;
  created_at?: string;
}

const categories = ['All', 'outdoor', 'indoor', 'adventure', 'relaxing', 'creative'];

export const DatePlanner = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedIdea, setSelectedIdea] = useState<DateIdea | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [dateIdeas, setDateIdeas] = useState<DateIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchDateIdeas();
    }
  }, [user, authLoading, navigate]);

  const fetchDateIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from('date_ideas')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setDateIdeas(data);
      } else {
        // Insert some default date ideas if none exist
        const defaultIdeas = [
          {
            title: 'Sunset Picnic in the Park',
            description: 'Pack your favorite snacks and watch the sunset together in a beautiful park setting.',
            category: 'outdoor' as any,
            duration_hours: 3,
            estimated_cost: '$',
            location_type: 'Local Park'
          },
          {
            title: 'Cooking Class for Two',
            description: 'Learn to make pasta from scratch while enjoying wine and each other\'s company.',
            category: 'indoor' as any,
            duration_hours: 4,
            estimated_cost: '$$$',
            location_type: 'Culinary Studio'
          },
          {
            title: 'Stargazing Adventure',
            description: 'Drive to a dark sky location with blankets and hot cocoa for a romantic night under the stars.',
            category: 'outdoor' as any,
            duration_hours: 5,
            estimated_cost: '$',
            location_type: 'Dark Sky Area'
          }
        ];

        const { data: insertedData, error: insertError } = await supabase
          .from('date_ideas')
          .insert(defaultIdeas)
          .select();

        if (!insertError && insertedData) {
          setDateIdeas(insertedData);
        }
      }
    } catch (error) {
      console.error('Error fetching date ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIdeas = activeCategory === 'All' 
    ? dateIdeas 
    : dateIdeas.filter(idea => idea.category === activeCategory);

  const handleSchedule = (idea: DateIdea) => {
    setSelectedIdea(idea);
    setSelectedDate('');
    setSelectedTime('');
    toast({
      title: "Great choice! 💕",
      description: `Let's schedule "${idea.title}" for you two!`,
    });
  };

  const confirmSchedule = async () => {
    if (!selectedDate || !selectedTime || !selectedIdea) {
      toast({
        title: "Missing details! ⏰",
        description: "Please select both date and time",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get user's couple ID first
      const { data: coupleData } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .single();

      const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}`);

      const { error } = await supabase
        .from('planned_dates')
        .insert({
          couple_id: coupleData?.id,
          created_by: user?.id,
          title: selectedIdea.title,
          description: selectedIdea.description,
          scheduled_date: scheduledDateTime.toISOString(),
          location: selectedIdea.location_type || 'TBD',
          date_idea_id: selectedIdea.id
        });

      if (error) throw error;
      
      toast({
        title: "Date scheduled! 🎉",
        description: `${selectedIdea.title} on ${new Date(selectedDate).toLocaleDateString()} at ${selectedTime}`,
      });
      setSelectedIdea(null);
    } catch (error) {
      console.error('Error scheduling date:', error);
      toast({
        title: "Error scheduling date",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-romance text-white p-6 shadow-romantic">
        <h1 className="text-2xl font-extrabold font-poppins mb-2">Date Planner</h1>
        <p className="text-white/80 font-inter font-bold">Find the perfect date idea for you two</p>
      </div>

      {/* Category Filters */}
      <div className="p-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={activeCategory === category ? "default" : "outline"}
              className={`px-4 py-2 rounded-full cursor-pointer whitespace-nowrap transition-all duration-200 ${
                activeCategory === category 
                  ? 'bg-secondary text-secondary-foreground shadow-romantic transform scale-105' 
                  : 'hover:bg-muted hover:scale-102'
              } font-bold`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      {/* Date Ideas Grid */}
      <div className="px-4 space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground font-bold">Loading amazing date ideas...</p>
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground font-bold">No date ideas found for this category</p>
          </div>
        ) : (
          filteredIdeas.map((idea, index) => (
            <div
              key={idea.id}
              className="bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-romantic transition-all duration-200 transform hover:scale-102 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Image */}
              <div className="h-48 relative overflow-hidden">
                <img 
                  src={dateActivitiesImage} 
                  alt={idea.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-gold-accent text-accent-foreground">
                    <Star size={12} className="mr-1" />
                    4.8
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-extrabold font-poppins text-foreground">{idea.title}</h3>
                  <Badge variant="outline" className="ml-2 font-bold">
                    {idea.category}
                  </Badge>
                </div>

                <p className="text-muted-foreground font-inter mb-4 leading-relaxed font-medium">
                  {idea.description}
                </p>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock size={16} />
                    <span className="font-bold">{idea.duration_hours || 2}-{(idea.duration_hours || 2) + 1} hours</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign size={16} />
                    <span className="font-bold">{idea.estimated_cost || '$'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                    <MapPin size={16} />
                    <span className="font-bold">{idea.location_type || 'Various locations'}</span>
                  </div>
                </div>

                {/* Action Button */}
                <Button 
                  onClick={() => handleSchedule(idea)}
                  variant="romantic"
                  className="w-full"
                >
                  <Calendar className="mr-2" size={18} />
                  Schedule This Date
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Modal (Simple version) */}
      {selectedIdea && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-romantic animate-slide-up">
            <div className="text-center mb-6">
              <Heart className="mx-auto text-secondary mb-2" size={32} />
              <h3 className="text-xl font-extrabold font-poppins mb-2">Schedule Your Date</h3>
              <p className="text-muted-foreground font-inter font-bold">
                {selectedIdea.title}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-bold text-foreground mb-2 block">Select Date</label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-foreground mb-2 block">Select Time</label>
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              
              <Button 
                variant="romantic" 
                className="w-full"
                onClick={confirmSchedule}
              >
                <CalendarPlus className="mr-2" />
                Confirm Schedule
              </Button>
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => setSelectedIdea(null)}
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};