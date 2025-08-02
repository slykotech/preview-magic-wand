import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BottomNavigation } from "@/components/BottomNavigation";
import { GradientHeader } from "@/components/GradientHeader";
import { Plus, Heart, Camera, X, Star, Upload, Image as ImageIcon, Grid3X3, List, Edit, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PermissionBanner } from "@/components/PermissionBanner";
import { usePermissions } from "@/hooks/usePermissions";

interface Memory {
  id: string;
  title: string;
  description: string | null;
  memory_date: string | null;
  image_url: string | null;
  couple_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  images?: MemoryImage[];
}

interface MemoryImage {
  id: string;
  memory_id: string;
  image_url: string;
  file_name: string | null;
  upload_order: number;
  created_at: string;
}

interface Note {
  id: string;
  title: string;
  content: string | null;
  couple_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
}

export const MemoryVault = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMemory, setNewMemory] = useState({
    title: "",
    description: "",
    memory_date: "",
    image_url: ""
  });
  const [newNote, setNewNote] = useState({
    title: "",
    content: ""
  });
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'photos' | 'notes' | 'favorites'>('all');
  const [createMode, setCreateMode] = useState<'photo' | 'note'>('photo');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { checkPermission } = usePermissions();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchCoupleAndMemories();
    }
  }, [user, authLoading, navigate]);

  const fetchCoupleAndMemories = async () => {
    try {
      const { data: coupleData } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .maybeSingle();

      if (coupleData) {
        setCoupleId(coupleData.id);
        await Promise.all([
          fetchMemories(coupleData.id),
          fetchNotes(coupleData.id)
        ]);
      }
    } catch (error) {
      console.error('Error fetching couple data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemories = async (couple_id: string) => {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select(`
          *,
          images:memory_images(*)
        `)
        .eq('couple_id', couple_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error('Error fetching memories:', error);
    }
  };

  const fetchNotes = async (couple_id: string) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('couple_id', couple_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const createMemory = async () => {
    if (!coupleId || !newMemory.title.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter at least a title for your memory",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: memoryData, error: memoryError } = await supabase
        .from('memories')
        .insert({
          title: newMemory.title,
          description: newMemory.description || null,
          memory_date: newMemory.memory_date || null,
          image_url: null,
          couple_id: coupleId,
          created_by: user?.id
        })
        .select()
        .single();

      if (memoryError) throw memoryError;

      setMemories([memoryData, ...memories]);
      setNewMemory({ title: "", description: "", memory_date: "", image_url: "" });
      setUploadedFiles([]);
      setShowCreateForm(false);

      toast({
        title: "Memory Created! 💕",
        description: `Your special moment has been saved`,
      });
    } catch (error) {
      console.error('Error creating memory:', error);
      toast({
        title: "Error",
        description: "Failed to create memory",
        variant: "destructive"
      });
    }
  };

  const createNote = async () => {
    if (!coupleId || !newNote.title.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter at least a title for your note",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .insert({
          title: newNote.title,
          content: newNote.content || null,
          couple_id: coupleId,
          created_by: user?.id
        })
        .select()
        .single();

      if (noteError) throw noteError;

      setNotes([noteData, ...notes]);
      setNewNote({ title: "", content: "" });
      setShowCreateForm(false);

      toast({
        title: "Note Created! 📝",
        description: `Your note has been saved`,
      });
    } catch (error) {
      console.error('Error creating note:', error);
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive"
      });
    }
  };

  const toggleFavorite = async (id: string, type: 'memory' | 'note', currentState: boolean) => {
    try {
      const table = type === 'memory' ? 'memories' : 'notes';
      const { error } = await supabase
        .from(table)
        .update({ is_favorite: !currentState })
        .eq('id', id);

      if (error) throw error;

      if (type === 'memory') {
        setMemories(prev => prev.map(m => 
          m.id === id ? { ...m, is_favorite: !currentState } : m
        ));
      } else {
        setNotes(prev => prev.map(n => 
          n.id === id ? { ...n, is_favorite: !currentState } : n
        ));
      }

      toast({
        title: !currentState ? "Added to Favorites! ⭐" : "Removed from Favorites",
        description: !currentState ? "This item is now favorited" : "This item is no longer favorited",
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getFilteredItems = () => {
    const allItems = [
      ...memories.map(m => ({ ...m, type: 'memory' as const })),
      ...notes.map(n => ({ ...n, type: 'note' as const }))
    ];

    return allItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.type === 'memory' && item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.type === 'note' && item.content && item.content.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (filterType === 'all') return matchesSearch;
      if (filterType === 'photos') return matchesSearch && item.type === 'memory';
      if (filterType === 'notes') return matchesSearch && item.type === 'note';
      if (filterType === 'favorites') return matchesSearch && item.is_favorite;
      
      return matchesSearch;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const filteredItems = getFilteredItems();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 relative overflow-hidden">
      {/* Gradient Header */}
      <GradientHeader
        title="Memory Vault"
        subtitle="Your love story collection"
        icon={<Heart size={24} />}
        showBackButton={false}
      >
        {/* Permission Banners */}
        {!checkPermission('mediaLibrary') && (
          <PermissionBanner
            type="mediaLibrary"
            message="Please re-enable Media Library access to upload photos from your gallery."
          />
        )}
        {!checkPermission('camera') && (
          <PermissionBanner
            type="camera"
            message="Please re-enable Camera access to capture new photos for memories."
          />
        )}
        
        {/* Enhanced Filter Tabs */}
        <Tabs value={filterType} onValueChange={(value) => setFilterType(value as typeof filterType)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>
        </Tabs>
      </GradientHeader>

      {/* Main Content */}
      <div className="p-6">
        {/* Search Bar */}
        <div className="mb-6">
          <Input
            placeholder="Search memories and notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/50 backdrop-blur-sm border-white/20"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 size={16} className="mr-1" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('timeline')}
            >
              <List size={16} className="mr-1" />
              Timeline
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-16">
            <Heart className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              {searchTerm ? "No matches found" : "No memories yet"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {searchTerm 
                ? "Try a different search term or browse all memories"
                : "Start your love story by creating your first memory or note"
              }
            </p>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && filteredItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="group bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-romantic transition-all duration-300 cursor-pointer transform hover:scale-102"
                onClick={() => {
                  if (item.type === 'memory') {
                    setSelectedMemory(item as Memory);
                  } else {
                    setSelectedNote(item as Note);
                  }
                }}
              >
                {/* Item header with type indicator */}
                <div className="p-4 border-b border-border/5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`p-1.5 rounded-lg ${
                        item.type === 'memory' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {item.type === 'memory' ? <Camera size={14} /> : <FileText size={14} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id, item.type, item.is_favorite);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                    >
                      <Star size={14} className={item.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'} />
                    </button>
                  </div>
                </div>

                {/* Content area */}
                <div className="p-4">
                  {/* Date footer */}
                  <div className="mt-auto">
                    <p className="text-muted-foreground text-xs">
                      {item.type === 'memory' && (item as Memory).memory_date 
                        ? formatDate((item as Memory).memory_date!) 
                        : formatDate(item.created_at)
                      }
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && filteredItems.length > 0 && (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-1 bg-border rounded-full"></div>
            {filteredItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="relative pl-12 mb-8">
                <div className="absolute left-2 top-1 h-5 w-5 border-4 border-background bg-primary rounded-full"></div>
                <p className="text-sm text-muted-foreground mb-1">
                  {item.type === 'memory' && (item as Memory).memory_date 
                    ? formatDate((item as Memory).memory_date!) 
                    : formatDate(item.created_at)
                  }
                </p>
                <Card className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        if (item.type === 'memory') {
                          setSelectedMemory(item as Memory);
                        } else {
                          setSelectedNote(item as Note);
                        }
                      }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {item.type === 'memory' ? <Camera size={18} /> : <FileText size={18} />}
                      {item.title}
                      {item.is_favorite && <Star size={16} className="fill-yellow-400 text-yellow-400" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {item.type === 'memory' && (item as Memory).description && (
                      <p className="text-muted-foreground">{(item as Memory).description}</p>
                    )}
                    {item.type === 'note' && (item as Note).content && (
                      <p className="text-muted-foreground">{(item as Note).content}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 z-50">
        <Button
          onClick={() => setShowCreateForm(true)}
          size="fab"
          className="bg-gradient-primary hover:opacity-90 text-white shadow-lg"
        >
          <Plus size={24} />
        </Button>
      </div>

      {/* Create Form Modal */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {createMode === 'photo' ? <Camera size={20} /> : <FileText size={20} />}
              Create New {createMode === 'photo' ? 'Memory' : 'Note'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Toggle between photo and note */}
            <div className="flex gap-2">
              <Button
                variant={createMode === 'photo' ? 'default' : 'outline'}
                onClick={() => setCreateMode('photo')}
                className="flex-1"
              >
                <Camera size={16} className="mr-1" />
                Memory
              </Button>
              <Button
                variant={createMode === 'note' ? 'default' : 'outline'}
                onClick={() => setCreateMode('note')}
                className="flex-1"
              >
                <FileText size={16} className="mr-1" />
                Note
              </Button>
            </div>

            {createMode === 'photo' ? (
              <>
                <div>
                  <Label htmlFor="memory-title">Title*</Label>
                  <Input
                    id="memory-title"
                    value={newMemory.title}
                    onChange={(e) => setNewMemory({...newMemory, title: e.target.value})}
                    placeholder="What's this memory about?"
                  />
                </div>
                <div>
                  <Label htmlFor="memory-description">Description</Label>
                  <Textarea
                    id="memory-description"
                    value={newMemory.description}
                    onChange={(e) => setNewMemory({...newMemory, description: e.target.value})}
                    placeholder="Tell the story..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="memory-date">Memory Date</Label>
                  <Input
                    id="memory-date"
                    type="date"
                    value={newMemory.memory_date}
                    onChange={(e) => setNewMemory({...newMemory, memory_date: e.target.value})}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowCreateForm(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={createMemory} className="flex-1">
                    Create Memory
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="note-title">Title*</Label>
                  <Input
                    id="note-title"
                    value={newNote.title}
                    onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                    placeholder="What's this note about?"
                  />
                </div>
                <div>
                  <Label htmlFor="note-content">Content</Label>
                  <Textarea
                    id="note-content"
                    value={newNote.content}
                    onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                    placeholder="Write your thoughts..."
                    rows={5}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowCreateForm(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={createNote} className="flex-1">
                    Create Note
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Memory Detail Modal */}
      <Dialog open={!!selectedMemory} onOpenChange={() => setSelectedMemory(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          {selectedMemory && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Camera size={20} />
                  {selectedMemory.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedMemory.description && (
                  <p className="text-muted-foreground">{selectedMemory.description}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {selectedMemory.memory_date ? formatDate(selectedMemory.memory_date) : formatDate(selectedMemory.created_at)}
                </p>
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => toggleFavorite(selectedMemory.id, 'memory', selectedMemory.is_favorite)}
                    variant="outline"
                    size="sm"
                  >
                    <Star size={16} className={`mr-1 ${selectedMemory.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    {selectedMemory.is_favorite ? 'Unfavorite' : 'Favorite'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Note Detail Modal */}
      <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          {selectedNote && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText size={20} />
                  {selectedNote.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedNote.content && (
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedNote.content}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedNote.created_at)}
                </p>
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => toggleFavorite(selectedNote.id, 'note', selectedNote.is_favorite)}
                    variant="outline"
                    size="sm"
                  >
                    <Star size={16} className={`mr-1 ${selectedNote.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    {selectedNote.is_favorite ? 'Unfavorite' : 'Favorite'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};