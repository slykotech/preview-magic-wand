import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Clock, Heart, Star, MapPin, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleData } from '@/hooks/useCoupleData';

interface CompletedDate {
  id: string;
  title: string;
  description: string;
  category: string;
  location?: string;
  completed_date: string;
  rating: number;
  notes?: string;
  scheduled_date?: string;
  scheduled_time?: string;
}

interface DateHistoryProps {
  onClose: () => void;
}

export const DateHistory = ({ onClose }: DateHistoryProps) => {
  const [completedDates, setCompletedDates] = useState<CompletedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const { coupleData } = useCoupleData();

  useEffect(() => {
    fetchCompletedDates();
  }, [coupleData]);

  const fetchCompletedDates = async () => {
    try {
      if (!coupleData?.id) return;
      
      const { data, error } = await supabase
        .from('date_ideas')
        .select('*')
        .eq('couple_id', coupleData.id)
        .eq('is_completed', true)
        .order('completed_date', { ascending: false });
        
      if (error) throw error;
      setCompletedDates(data || []);
    } catch (error) {
      console.error('Error fetching completed dates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < rating ? "text-yellow-400 fill-current" : "text-gray-300"}
      />
    ));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'romantic':
        return '🍷';
      case 'adventure':
        return '🌟';
      case 'relaxing':
        return '🌸';
      default:
        return '💕';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-background border-border shadow-romantic">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Heart className="text-red-500" size={24} />
            Date History
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
        <p className="text-muted-foreground">
          Relive your amazing dates together
        </p>
      </CardHeader>
      
      <CardContent className="max-h-[70vh] overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your date history...</p>
          </div>
        ) : completedDates.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-bold text-muted-foreground">
              No completed dates yet
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Start planning dates to build your history together!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {completedDates.map((date, index) => (
              <div
                key={date.id}
                className="bg-white border border-border rounded-xl p-4 shadow-soft hover:shadow-romantic transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {date.title} {getCategoryIcon(date.category)}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <CalendarIcon size={14} />
                        <span className="font-semibold">
                          {format(new Date(date.completed_date), "MMM d, yyyy")}
                        </span>
                      </div>
                      {date.scheduled_time && (
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span className="font-semibold">{date.scheduled_time}</span>
                        </div>
                      )}
                      {date.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          <span className="font-semibold">{date.location}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex">{getRatingStars(date.rating)}</div>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                        Completed
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {date.description && (
                  <p className="text-muted-foreground text-sm mb-3 italic">
                    {date.description}
                  </p>
                )}
                
                {date.notes && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      <strong>Notes:</strong> {date.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};