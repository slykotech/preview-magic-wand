import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BottomNavigation } from "@/components/BottomNavigation";
import { GradientHeader } from "@/components/GradientHeader";
import { 
  Plus, Heart, Camera, X, Star, Upload, Image as ImageIcon, 
  Grid3X3, List, Edit, Trash2, FileText, Clock, Search,
  Calendar, MapPin, Tag
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
  image_url: string | null; // Legacy field for backward compatibility
  couple_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  images?: MemoryImage[]; // New multi-image support
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

type ViewMode = 'grid' | 'timeline';
type TabType = 'all' | 'notes' | 'photos';
type UploadResult = { url: string; fileName: string };

export const MemoryVault = () => {
  // Core state
  const [memories, setMemories] = useState<Memory[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  
  // UI state
  const [selectedItem, setSelectedItem] = useState<(Memory | Note) & { type: 'memory' | 'note' } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; type: 'memory' | 'note' } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'memory' | 'note' } | null>(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  
  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Form state
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

  // Initialize data
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

  // File upload functions
  const uploadImages = async (files: File[]): Promise<UploadResult[]> => {
    try {
      setUploading(true);
      const uploadPromises = files.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}_${index}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('memory-images')
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('memory-images')
          .getPublicUrl(fileName);

        return {
          url: urlData.publicUrl,
          fileName: file.name
        };
      });

      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload images",
        variant: "destructive"
      });
      return [];
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      handleFilesSelect(files);
    }
  }, []);

  const handleFilesSelect = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Only image files are allowed",
        variant: "destructive"
      });
    }
    setUploadedFiles(prev => [...prev, ...imageFiles]);
  };

  // CRUD operations
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
      // Create the memory first
      const { data: memoryData, error: memoryError } = await supabase
        .from('memories')
        .insert({
          title: newMemory.title,
          description: newMemory.description || null,
          memory_date: newMemory.memory_date || null,
          image_url: null, // Keep for backward compatibility
          couple_id: coupleId,
          created_by: user?.id
        })
        .select()
        .single();

      if (memoryError) throw memoryError;

      // Upload images if files are selected
      if (uploadedFiles.length > 0) {
        const uploadResults = await uploadImages(uploadedFiles);
        
        if (uploadResults.length > 0) {
          // Insert memory images
          const memoryImages = uploadResults.map((result, index) => ({
            memory_id: memoryData.id,
            image_url: result.url,
            file_name: result.fileName,
            upload_order: index
          }));

          const { error: imagesError } = await supabase
            .from('memory_images')
            .insert(memoryImages);

          if (imagesError) throw imagesError;
        }
      }

      // Fetch updated memory with images
      const { data: updatedMemory } = await supabase
        .from('memories')
        .select(`*, images:memory_images(*)`)
        .eq('id', memoryData.id)
        .single();

      if (updatedMemory) {
        setMemories(prev => [updatedMemory, ...prev]);
      }

      // Reset form
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

      setNotes(prev => [noteData, ...prev]);
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

  const deleteItem = async () => {
    if (!itemToDelete) return;

    setDeleting(true);
    try {
      if (itemToDelete.type === 'memory') {
        const memory = memories.find(m => m.id === itemToDelete.id);
        
        // Delete images from storage first
        if (memory?.images && memory.images.length > 0) {
          const filePaths = memory.images.map(img => {
            const url = new URL(img.image_url);
            return url.pathname.split('/').pop() || '';
          }).filter(path => path);

          if (filePaths.length > 0) {
            await supabase.storage
              .from('memory-images')
              .remove(filePaths);
          }
        }

        // Delete memory from database
        const { error: deleteError } = await supabase
          .from('memories')
          .delete()
          .eq('id', itemToDelete.id);

        if (deleteError) throw deleteError;
        setMemories(prev => prev.filter(m => m.id !== itemToDelete.id));
      } else {
        const { error: deleteError } = await supabase
          .from('notes')
          .delete()
          .eq('id', itemToDelete.id);

        if (deleteError) throw deleteError;
        setNotes(prev => prev.filter(n => n.id !== itemToDelete.id));
      }

      toast({
        title: "Item Deleted",
        description: `${itemToDelete.type === 'memory' ? 'Memory' : 'Note'} has been removed`
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
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

  // Render functions
  const renderMemoryCard = (memory: Memory & { type: 'memory' }) => {
    const hasImages = memory.images && memory.images.length > 0;
    
    if (hasImages) {
      return (
        <div 
          key={`memory-${memory.id}`}
          className="break-inside-avoid mb-4 group cursor-pointer hover-scale animate-fade-in"
          onClick={() => setSelectedItem(memory)}
        >
          <div className="relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="relative aspect-[4/5]">
              <img 
                src={memory.images![0].image_url} 
                alt={memory.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              {/* Action buttons */}
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(memory.id, memory.type, memory.is_favorite);
                  }}
                  className="p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-all"
                >
                  <Star 
                    size={16} 
                    className={memory.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-white'}
                  />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingItem({ id: memory.id, type: memory.type });
                  }}
                  className="p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-all"
                >
                  <Edit size={16} className="text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setItemToDelete({ id: memory.id, type: memory.type });
                    setShowDeleteDialog(true);
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
                <h3 className="text-white font-bold text-lg mb-1 line-clamp-2">{memory.title}</h3>
                {memory.description && (
                  <p className="text-white/80 text-sm line-clamp-2 mb-2">
                    {memory.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-white/60 text-xs">
                  <Calendar size={12} />
                  {memory.memory_date ? formatDate(memory.memory_date) : formatDate(memory.created_at)}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Text-based memory card (no images)
    return renderTextCard(memory);
  };

  const renderNoteCard = (note: Note & { type: 'note' }) => {
    return renderTextCard(note);
  };

  const renderTextCard = (item: (Memory | Note) & { type: 'memory' | 'note' }) => {
    return (
      <Card 
        key={`${item.type}-${item.id}`}
        className="mb-4 break-inside-avoid bg-white shadow-md hover:shadow-lg transition-all duration-300 hover-scale cursor-pointer group animate-fade-in"
        onClick={() => setSelectedItem(item)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${
                item.type === 'memory' 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' 
                  : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
              }`}>
                {item.type === 'memory' ? <Camera size={14} /> : <FileText size={14} />}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock size={12} />
                {formatDate(item.created_at)}
              </div>
              {item.is_favorite && (
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
              )}
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
                  setItemToDelete({ id: item.id, type: item.type });
                  setShowDeleteDialog(true);
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          </div>
          
          <h3 className="font-bold text-foreground text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {item.title}
          </h3>
          
          {item.type === 'memory' && (item as Memory).description && (
            <div>
              <p className="text-muted-foreground text-sm line-clamp-3 mb-2">
                {truncateText((item as Memory).description!, 3)}
              </p>
              {(item as Memory).description!.length > 150 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(item);
                  }}
                  className="text-primary text-sm hover:underline"
                >
                  Read More
                </button>
              )}
            </div>
          )}
          
          {item.type === 'note' && (item as Note).content && (
            <div>
              <p className="text-muted-foreground text-sm line-clamp-3 mb-2">
                {truncateText((item as Note).content!, 3)}
              </p>
              {(item as Note).content!.length > 150 && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(item);
                  }}
                  className="text-primary text-sm hover:underline"
                >
                  Read More
                </button>
              )}
            </div>
          )}

          {item.type === 'memory' && (item as Memory).memory_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <MapPin size={10} />
              Memory from {formatDate((item as Memory).memory_date!)}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderTimelineView = () => {
    const filteredItems = getFilteredItems();
    const groupedByDate = filteredItems.reduce((acc, item) => {
      const date = item.type === 'memory' && (item as Memory).memory_date 
        ? (item as Memory).memory_date! 
        : item.created_at.split('T')[0];
      
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {} as Record<string, typeof filteredItems>);

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    return (
      <div className="max-w-4xl mx-auto">
        {sortedDates.map(date => (
          <div key={date} className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
                <Calendar size={16} className="text-primary" />
                <span className="text-sm font-medium text-primary">
                  {formatDate(date)}
                </span>
              </div>
              <div className="flex-1 h-px bg-border"></div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupedByDate[date].map(item => 
                item.type === 'memory' ? renderMemoryCard(item as Memory & { type: 'memory' }) 
                                      : renderNoteCard(item as Note & { type: 'note' })
              )}
            </div>
          </div>
        ))}
      </div>
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
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <Input 
            placeholder="Search memories and notes..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/50 backdrop-blur-sm border-white/20 pl-10"
          />
        </div>

        {/* View Mode Toggle */}
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
              variant={viewMode === 'timeline' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setViewMode('timeline')}
            >
              <Clock size={16} />
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <Heart className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              {searchTerm ? "No matches found" : "No memories yet"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
              {searchTerm 
                ? "Try a different search term or browse all memories" 
                : "Start your love story by creating your first memory or note"
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus size={16} className="mr-2" />
                Create Memory
              </Button>
            )}
          </div>
        )}

        {/* Content Views */}
        {filteredItems.length > 0 && (
          <>
            {viewMode === 'timeline' ? (
              renderTimelineView()
            ) : (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                {filteredItems.map(item => 
                  item.type === 'memory' ? renderMemoryCard(item as Memory & { type: 'memory' }) 
                                        : renderNoteCard(item as Note & { type: 'note' })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button */}
      <Button
        onClick={() => setShowCreateForm(true)}
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform"
        size="icon"
      >
        <Plus size={24} />
      </Button>

      {/* Read More Modal */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedItem.type === 'memory' 
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' 
                      : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                  }`}>
                    {selectedItem.type === 'memory' ? <Camera size={20} /> : <FileText size={20} />}
                  </div>
                  <DialogTitle className="text-xl">{selectedItem.title}</DialogTitle>
                  {selectedItem.is_favorite && (
                    <Star size={20} className="fill-yellow-400 text-yellow-400" />
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSelectedItem(null)}
                >
                  <X size={20} />
                </Button>
              </div>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  {formatDate(selectedItem.created_at)} at {formatTime(selectedItem.created_at)}
                </div>
                {selectedItem.type === 'memory' && (selectedItem as Memory).memory_date && (
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    Memory from {formatDate((selectedItem as Memory).memory_date!)}
                  </div>
                )}
              </div>

              {selectedItem.type === 'memory' && (selectedItem as Memory).images && (selectedItem as Memory).images!.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(selectedItem as Memory).images!.map((img) => (
                    <div key={img.id} className="relative rounded-lg overflow-hidden">
                      <img 
                        src={img.image_url} 
                        alt={selectedItem.title}
                        className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}

              {selectedItem.type === 'memory' && (selectedItem as Memory).description && (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                    {(selectedItem as Memory).description}
                  </p>
                </div>
              )}

              {selectedItem.type === 'note' && (selectedItem as Note).content && (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                    {(selectedItem as Note).content}
                  </p>
                </div>
              )}

              <div className="flex justify-center gap-3 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setEditingItem({ id: selectedItem.id, type: selectedItem.type });
                    setSelectedItem(null);
                  }}
                >
                  <Edit size={16} className="mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => toggleFavorite(selectedItem.id, selectedItem.type, selectedItem.is_favorite)}
                >
                  <Star 
                    size={16} 
                    className={`mr-2 ${selectedItem.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
                  />
                  {selectedItem.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </Button>
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {activeTab === 'photos' || activeTab === 'all' ? 'Create Memory' : 'Create Note'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={activeTab === 'notes' ? newNote.title : newMemory.title}
                  onChange={(e) => {
                    if (activeTab === 'notes') {
                      setNewNote({ ...newNote, title: e.target.value });
                    } else {
                      setNewMemory({ ...newMemory, title: e.target.value });
                    }
                  }}
                  placeholder="Enter title..."
                />
              </div>

              {activeTab !== 'notes' ? (
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
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleFilesSelect(Array.from(e.target.files));
                          }
                        }}
                        className="hidden"
                      />
                      
                      {uploadedFiles.length > 0 ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            {uploadedFiles.slice(0, 6).map((file, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`Upload ${index + 1}`}
                                  className="w-full h-16 object-cover rounded"
                                />
                                <button
                                  onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          {uploadedFiles.length > 6 && (
                            <p className="text-sm text-muted-foreground">
                              +{uploadedFiles.length - 6} more files
                            </p>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full"
                          >
                            <Plus size={16} className="mr-2" />
                            Add More Photos
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Drag photos here or click to upload</p>
                            <p className="text-xs text-muted-foreground">Support for multiple images</p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload size={16} className="mr-2" />
                            Choose Photos
                          </Button>
                        </div>
                      )}
                    </div>
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
                    rows={8}
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
                  onClick={activeTab === 'notes' ? createNote : createMemory}
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

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && itemToDelete && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {itemToDelete.type === 'memory' ? 'Memory' : 'Note'}</DialogTitle>
            </DialogHeader>
            
            <p className="text-muted-foreground">
              Are you sure you want to delete this {itemToDelete.type}? This action cannot be undone.
            </p>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setItemToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={deleteItem}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <BottomNavigation />
    </div>
  );
};