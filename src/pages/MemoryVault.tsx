import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Plus, Heart, Camera, Edit3, X, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Memory {
  id: string;
  title: string;
  content: string;
  memory_date: string;
  type: 'photo' | 'journal' | 'milestone';
  is_favorite: boolean;
  tags: string[];
  created_at: string;
}

export const MemoryVault = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showFABOptions, setShowFABOptions] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
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
      fetchMemories();
    }
  }, [user, authLoading, navigate]);

  const fetchMemories = async () => {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error('Error fetching memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhoto = () => {
    setShowFABOptions(false);
    toast({
      title: "Add Photo Memory 📸",
      description: "Camera functionality would open here",
    });
  };

  const handleAddJournal = () => {
    setShowFABOptions(false);
    toast({
      title: "Add Journal Entry ✍️",
      description: "Journal editor would open here",
    });
  };

  const openMemory = (memory: Memory) => {
    setSelectedMemory(memory);
  };

  const closeMemory = () => {
    setSelectedMemory(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-romance text-white p-6 shadow-romantic">
        <h1 className="text-2xl font-extrabold font-poppins mb-2">Memory Vault</h1>
        <p className="text-white/80 font-inter font-bold">Your love story, beautifully preserved</p>
      </div>

      {/* Memories Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4">
          {memories.map((memory, index) => (
            <div
              key={memory.id}
              onClick={() => openMemory(memory)}
              className="bg-card rounded-2xl p-6 shadow-soft hover:shadow-romantic transition-all duration-200 transform hover:scale-102 cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    memory.type === 'photo' ? 'bg-sunrise-coral/20 text-sunrise-coral' : 'bg-gold-accent/20 text-gold-accent'
                  }`}>
                    {memory.type === 'photo' ? <Camera size={16} /> : <Edit3 size={16} />}
                  </div>
                  <div>
                    <h3 className="font-poppins font-bold text-foreground">{memory.title}</h3>
                    <p className="text-sm text-muted-foreground font-inter font-semibold">
                      {new Date(memory.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
                {memory.is_favorite && (
                  <Star className="text-gold-accent animate-pulse" size={20} fill="currentColor" />
                )}
              </div>

              <p className="text-muted-foreground font-inter text-sm leading-relaxed mb-3 line-clamp-2 font-medium">
                {memory.content}
              </p>

              <div className="flex flex-wrap gap-2">
                {memory.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-muted rounded-full text-xs text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 z-40">
        {/* FAB Options */}
        {showFABOptions && (
          <div className="absolute bottom-16 right-0 space-y-3 animate-slide-up">
            <Button
              onClick={handleAddPhoto}
              variant="floating"
              size="fab"
              className="shadow-romantic"
            >
              <Camera size={20} />
            </Button>
            <Button
              onClick={handleAddJournal}
              variant="floating"
              size="fab"
              className="shadow-romantic"
            >
              <Edit3 size={20} />
            </Button>
          </div>
        )}

        {/* Main FAB */}
        <Button
          onClick={() => setShowFABOptions(!showFABOptions)}
          variant="floating"
          size="fab"
          className="shadow-romantic"
        >
          <div className={`transition-transform duration-300 ${showFABOptions ? 'rotate-45' : ''}`}>
            <Plus size={24} />
          </div>
        </Button>
      </div>

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-lg shadow-romantic animate-slide-up max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  selectedMemory.type === 'photo' ? 'bg-sunrise-coral/20 text-sunrise-coral' : 'bg-gold-accent/20 text-gold-accent'
                }`}>
                  {selectedMemory.type === 'photo' ? <Camera size={20} /> : <Edit3 size={20} />}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold font-poppins text-foreground">{selectedMemory.title}</h2>
                  <p className="text-sm text-muted-foreground font-inter font-bold">
                    {new Date(selectedMemory.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <Button
                onClick={closeMemory}
                variant="ghost"
                size="icon"
                className="shrink-0"
              >
                <X size={20} />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6">
              {selectedMemory.type === 'photo' && (
                <div className="w-full h-48 bg-gradient-romance rounded-xl mb-4 flex items-center justify-center">
                  <Heart className="text-white opacity-50" size={48} />
                </div>
              )}

              <p className="text-foreground font-inter leading-relaxed mb-6 font-medium">
                {selectedMemory.content}
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {selectedMemory.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="romantic" className="flex-1">
                  <Heart className="mr-2" size={16} />
                  {selectedMemory.is_favorite ? 'Favorited' : 'Add to Favorites'}
                </Button>
                <Button variant="outline" className="flex-1">
                  <Edit3 className="mr-2" size={16} />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop for FAB options */}
      {showFABOptions && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => setShowFABOptions(false)}
        />
      )}

      <BottomNavigation />
    </div>
  );
};