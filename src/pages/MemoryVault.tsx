import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BottomNavigation } from "@/components/BottomNavigation";
import { GradientHeader } from "@/components/GradientHeader";
import { 
  Plus, Heart, Camera, X, Star, Upload, Image as ImageIcon, 
  Grid3X3, List, Edit, Trash2, FileText, MoreHorizontal 
} from "lucide-react";
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

type ViewMode = 'grid' | 'list';
type TabType = 'all' | 'notes' | 'photos';

export const MemoryVault = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<(Memory | Note) & { type: 'memory' | 'note' } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; type: 'memory' | 'note' } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [newMemory, setNewMemory] = useState({
    title: "",
    description: "",
    memory_date: ""
  });
  
  const [newNote, setNewNote] = useState({
    title: "",
    content: ""
  });

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
      fetchCoupleAndData();
    }
  }, [user, authLoading, navigate]);

  const fetchCoupleAndData = async () => {
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

  const handleFileUpload = async (files: File[]) => {
    if (!coupleId) return [];
    
    const uploadPromises = files.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${coupleId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('memory-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('memory-images')
        .getPublicUrl(filePath);

      return publicUrl;
    });

    return Promise.all(uploadPromises);
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

    setUploading(true);
    try {
      const { data: memoryData, error: memoryError } = await supabase
        .from('memories')
        .insert({
          title: newMemory.title,
          description: newMemory.description || null,
          memory_date: newMemory.memory_date || null,
          couple_id: coupleId,
          created_by: user?.id
        })
        .select()
        .single();

      if (memoryError) throw memoryError;

      if (uploadedFiles.length > 0) {
        const imageUrls = await handleFileUpload(uploadedFiles);
        
        const imageInserts = imageUrls.map((url, index) => ({
          memory_id: memoryData.id,
          image_url: url,
          file_name: uploadedFiles[index].name,
          upload_order: index
        }));

        await supabase.from('memory_images').insert(imageInserts);
      }

      await fetchMemories(coupleId);
      setNewMemory({ title: "", description: "", memory_date: "" });
      setUploadedFiles([]);
      setShowCreateForm(false);
      
      toast({
        title: "Memory Created! 💕",
        description: "Your special moment has been saved"
      });
    } catch (error) {
      console.error('Error creating memory:', error);
      toast({
        title: "Error",
        description: "Failed to create memory",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
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
        description: "Your note has been saved"
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
        description: !currentState ? "This item is now favorited" : "This item is no longer favorited"
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

  const deleteItem = async (id: string, type: 'memory' | 'note') => {
    try {
      const table = type === 'memory' ? 'memories' : 'notes';
      const { error } = await supabase.from(table).delete().eq('id', id);

      if (error) throw error;

      if (type === 'memory') {
        setMemories(prev => prev.filter(m => m.id !== id));
      } else {
        setNotes(prev => prev.filter(n => n.id !== id));
      }

      toast({
        title: "Deleted successfully",
        description: `${type === 'memory' ? 'Memory' : 'Note'} has been removed`
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateText = (text: string, maxLines: number = 3) => {
    const words = text.split(' ');
    const wordsPerLine = 10; // Approximate
    const maxWords = maxLines * wordsPerLine;
    
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const getFilteredItems = () => {
    let allItems: Array<(Memory | Note) & { type: 'memory' | 'note' }> = [];

    if (activeTab === 'all') {
      allItems = [
        ...memories.map(m => ({ ...m, type: 'memory' as const })),
        ...notes.map(n => ({ ...n, type: 'note' as const }))
      ];
    } else if (activeTab === 'photos') {
      allItems = memories.map(m => ({ ...m, type: 'memory' as const }));
    } else if (activeTab === 'notes') {
      allItems = notes.map(n => ({ ...n, type: 'note' as const }));
    }

    return allItems
      .filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.type === 'memory' && (item as Memory).description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.type === 'note' && (item as Note).content?.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSearch;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const renderItemCard = (item: (Memory | Note) & { type: 'memory' | 'note' }) => {
    const isMemoryWithImages = item.type === 'memory' && (item as Memory).images && (item as Memory).images!.length > 0;
    
    if (isMemoryWithImages) {
      const memory = item as Memory;
      return (
        <div 
          key={`${item.type}-${item.id}`}
          className="break-inside-avoid mb-4 group cursor-pointer hover-scale"
          onClick={() => setSelectedItem(item)}
        >
          <div className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="relative aspect-[4/5]">
              <img 
                src={memory.images![0].image_url} 
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              {/* Action buttons */}
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.id, item.type, item.is_favorite);
                  }}
                  className="p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-all"
                >
                  <Star 
                    size={16} 
                    className={item.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-white'}
                  />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingItem({ id: item.id, type: item.type });
                  }}
                  className="p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-all"
                >
                  <Edit size={16} className="text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this memory?')) {
                      deleteItem(item.id, item.type);
                    }
                  }}
                  className="p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-red-500/70 transition-all"
                >
                  <Trash2 size={16} className="text-white" />
                </button>
              </div>

              {/* Multiple images indicator */}
              {memory.images!.length > 1 && (
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/30 backdrop-blur-sm rounded-full">
                  <span className="text-white text-xs font-medium">
                    +{memory.images!.length - 1}
                  </span>
                </div>
              )}

              {/* Title overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-bold text-lg mb-1">{item.title}</h3>
                <p className="text-white/60 text-xs">
                  {memory.memory_date ? formatDate(memory.memory_date) : formatDate(item.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Text-based card (notes or memories without images)
    return (
      <Card 
        key={`${item.type}-${item.id}`}
        className="mb-4 break-inside-avoid bg-white shadow-md hover:shadow-lg transition-all duration-300 hover-scale cursor-pointer group"
        onClick={() => setSelectedItem(item)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${
                item.type === 'memory' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-green-100 text-green-600'
              }`}>
                {item.type === 'memory' ? <Camera size={14} /> : <FileText size={14} />}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDate(item.created_at)}
              </span>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(item.id, item.type, item.is_favorite);
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <Star 
                  size={14} 
                  className={item.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}
                />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingItem({ id: item.id, type: item.type });
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <Edit size={14} className="text-muted-foreground" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Are you sure you want to delete this ${item.type}?`)) {
                    deleteItem(item.id, item.type);
                  }
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          </div>
          
          <h3 className="font-bold text-foreground text-lg mb-2 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          
          {item.type === 'memory' && (item as Memory).description && (
            <div>
              <p className="text-muted-foreground text-sm line-clamp-3">
                {truncateText((item as Memory).description!, 3)}
              </p>
              {(item as Memory).description!.length > 150 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(item);
                  }}
                  className="text-primary text-sm mt-1 hover:underline"
                >
                  Read More
                </button>
              )}
            </div>
          )}
          
          {item.type === 'note' && (item as Note).content && (
            <div>
              <p className="text-muted-foreground text-sm line-clamp-3">
                {truncateText((item as Note).content!, 3)}
              </p>
              {(item as Note).content!.length > 150 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(item);
                  }}
                  className="text-primary text-sm mt-1 hover:underline"
                >
                  Read More
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
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
      </GradientHeader>

      {/* Main Content */}
      <div className="p-6">
        {/* Tabs - Native horizontal scroll */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
            <TabsList className="grid w-full grid-cols-3 max-w-xs mx-auto bg-white/50 backdrop-blur-sm">
              <TabsTrigger value="all" className="text-sm">All</TabsTrigger>
              <TabsTrigger value="notes" className="text-sm">Notes</TabsTrigger>
              <TabsTrigger value="photos" className="text-sm">Photos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <Input 
            placeholder="Search memories and notes..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/50 backdrop-blur-sm border-white/20"
          />
        </div>

        {/* View Mode Toggle - Top right of content area */}
        <div className="flex justify-end items-center mb-6">
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 size={16} />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
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

        {/* Content Grid/List */}
        {filteredItems.length > 0 && (
          <div className={
            viewMode === 'grid' 
              ? "columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4" 
              : "max-w-2xl mx-auto space-y-4"
          }>
            {filteredItems.map(renderItemCard)}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {activeTab === 'photos' && (
        <Button
          onClick={() => setShowCreateForm(true)}
          className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform"
          size="icon"
        >
          <Plus size={24} />
        </Button>
      )}

      {/* Read More Modal */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl">{selectedItem.title}</DialogTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSelectedItem(null)}
                >
                  <X size={20} />
                </Button>
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className={`p-1.5 rounded-lg ${
                  selectedItem.type === 'memory' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-green-100 text-green-600'
                }`}>
                  {selectedItem.type === 'memory' ? <Camera size={14} /> : <FileText size={14} />}
                </div>
                {formatDate(selectedItem.created_at)}
                {selectedItem.is_favorite && <Star size={14} className="fill-yellow-400 text-yellow-400" />}
              </div>

              {selectedItem.type === 'memory' && (selectedItem as Memory).images && (
                <div className="grid grid-cols-2 gap-2">
                  {(selectedItem as Memory).images!.map((img) => (
                    <img 
                      key={img.id}
                      src={img.image_url} 
                      alt={selectedItem.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {selectedItem.type === 'memory' && (selectedItem as Memory).description && (
                <p className="text-foreground whitespace-pre-wrap">
                  {(selectedItem as Memory).description}
                </p>
              )}

              {selectedItem.type === 'note' && (selectedItem as Note).content && (
                <p className="text-foreground whitespace-pre-wrap">
                  {(selectedItem as Note).content}
                </p>
              )}

              <div className="flex justify-center pt-4">
                <Button onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {activeTab === 'photos' ? 'Create Memory' : 'Create Note'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={activeTab === 'photos' ? newMemory.title : newNote.title}
                  onChange={(e) => {
                    if (activeTab === 'photos') {
                      setNewMemory({ ...newMemory, title: e.target.value });
                    } else {
                      setNewNote({ ...newNote, title: e.target.value });
                    }
                  }}
                  placeholder="Enter title..."
                />
              </div>

              {activeTab === 'photos' ? (
                <>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newMemory.description}
                      onChange={(e) => setNewMemory({ ...newMemory, description: e.target.value })}
                      placeholder="Share the story behind this memory..."
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="memory_date">Memory Date</Label>
                    <Input
                      id="memory_date"
                      type="date"
                      value={newMemory.memory_date}
                      onChange={(e) => setNewMemory({ ...newMemory, memory_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Photos</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          setUploadedFiles(Array.from(e.target.files));
                        }
                      }}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload size={16} className="mr-2" />
                      Choose Photos ({uploadedFiles.length} selected)
                    </Button>
                  </div>
                </>
              ) : (
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    placeholder="Write your note..."
                    rows={6}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={activeTab === 'photos' ? createMemory : createNote}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <BottomNavigation />
    </div>
  );
};