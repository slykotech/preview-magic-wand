import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Sparkles, Heart, TrendingUp, ArrowLeft, Lightbulb, Target, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface RelationshipInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  priority: number;
  is_read: boolean;
  created_at: string;
}

export const RelationshipInsights = () => {
  const [insights, setInsights] = useState<RelationshipInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [syncScore, setSyncScore] = useState<number>(75);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchInsights();
    }
  }, [user, authLoading, navigate]);

  const fetchInsights = async () => {
    try {
      // Get couple ID first
      const { data: coupleData } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .maybeSingle();

      if (coupleData) {
        setCoupleId(coupleData.id);
        
        // Generate insights first
        await supabase.rpc('generate_relationship_insights', { p_couple_id: coupleData.id });
        
        // Get sync score
        const { data: syncData } = await supabase
          .from('sync_scores')
          .select('score')
          .eq('couple_id', coupleData.id)
          .order('calculated_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (syncData) {
          setSyncScore(syncData.score);
        } else {
          // Calculate new sync score
          const { data: calculatedScore } = await supabase
            .rpc('calculate_sync_score', { p_couple_id: coupleData.id });
          
          if (calculatedScore) {
            setSyncScore(calculatedScore);
            await supabase
              .from('sync_scores')
              .upsert({
                couple_id: coupleData.id,
                score: calculatedScore,
                calculated_date: new Date().toISOString().split('T')[0]
              });
          }
        }
        
        // Fetch insights
        const { data: insightsData, error } = await supabase
          .from('relationship_insights')
          .select('*')
          .eq('couple_id', coupleData.id)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setInsights(insightsData || []);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
      toast({
        title: "Error",
        description: "Failed to load insights",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (insightId: string) => {
    try {
      await supabase
        .from('relationship_insights')
        .update({ is_read: true })
        .eq('id', insightId);

      setInsights(insights.map(insight => 
        insight.id === insightId ? { ...insight, is_read: true } : insight
      ));
    } catch (error) {
      console.error('Error marking insight as read:', error);
    }
  };

  const getSyncScoreLevel = (score: number) => {
    if (score >= 90) return { level: "Excellent", color: "text-green-600", bg: "bg-green-50" };
    if (score >= 75) return { level: "Good", color: "text-blue-600", bg: "bg-blue-50" };
    if (score >= 60) return { level: "Fair", color: "text-yellow-600", bg: "bg-yellow-50" };
    return { level: "Needs Work", color: "text-red-600", bg: "bg-red-50" };
  };

  const scoreLevel = getSyncScoreLevel(syncScore);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-romance text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-white hover:bg-white/20 p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold font-poppins">Relationship Insights</h1>
            <p className="text-white/80 text-sm font-inter font-bold">Powered by AI analysis</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Sync Score Card */}
        <Card className={`${scoreLevel.bg} border-none`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Relationship Health</h3>
                <p className={`text-sm font-semibold ${scoreLevel.color}`}>{scoreLevel.level}</p>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-extrabold ${scoreLevel.color}`}>{syncScore}%</div>
                <div className="text-xs text-muted-foreground">Sync Score</div>
              </div>
            </div>
            <div className="w-full bg-white/50 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  syncScore >= 90 ? 'bg-green-500' :
                  syncScore >= 75 ? 'bg-blue-500' :
                  syncScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${syncScore}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Personalized Insights</h2>
          
          {insights.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Lightbulb className="mx-auto text-muted-foreground mb-4" size={48} />
                <h3 className="text-lg font-bold text-foreground mb-2">No insights yet</h3>
                <p className="text-muted-foreground mb-4">
                  Complete daily check-ins to get personalized relationship insights!
                </p>
                <Button onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          ) : (
            insights.map((insight) => (
              <Card key={insight.id} className={`${!insight.is_read ? 'border-primary/30 bg-primary/5' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/20 text-primary">
                        {insight.insight_type === 'checkin_frequency' ? <TrendingUp size={20} /> : <Lightbulb size={20} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{insight.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(insight.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {!insight.is_read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(insight.id)}
                      >
                        <CheckCircle size={16} className="mr-1" />
                        Mark Read
                      </Button>
                    )}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {insight.description}
                  </p>
                  {insight.priority >= 4 && (
                    <div className="mt-3 p-3 bg-accent/10 rounded-lg">
                      <p className="text-sm font-semibold text-accent">💡 Pro Tip: This insight has high importance for your relationship growth!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Action Suggestions */}
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-none">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Target size={20} />
              Recommended Actions
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                <Heart size={16} className="text-primary" />
                <span className="font-medium">Continue daily check-ins to maintain your streak</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                <Sparkles size={16} className="text-secondary" />
                <span className="font-medium">Plan a special date to boost relationship satisfaction</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                <TrendingUp size={16} className="text-accent" />
                <span className="font-medium">Share more memories to strengthen your bond</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};