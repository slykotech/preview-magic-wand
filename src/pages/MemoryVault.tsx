import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Plus, Heart, Camera, X, Star, Upload, Image as ImageIcon, Grid3X3, List, Edit, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
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
  const [dragActive, setDragActive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'photos' | 'notes' | 'favorites'>('all');
  const [fabOpen, setFabOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'photo' | 'note'>('photo');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchCoupleAndMemories();
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (fabOpen) {
        setFabOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [fabOpen]);

  const fetchCoupleAndMemories = async () => {
    try {
      // Get couple ID first
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

  const uploadImages = async (files: File[]): Promise<Array<{url: string, fileName: string}>> => {
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
        description: "Failed to upload some images. Please try again.",
        variant: "destructive"
      });
      return [];
    } finally {
      setUploading(false);
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

      // Fetch updated memory with images
      const { data: updatedMemory } = await supabase
        .from('memories')
        .select(`
          *,
          images:memory_images(*)
        `)
        .eq('id', memoryData.id)
        .single();

      setMemories([updatedMemory, ...memories]);
      setNewMemory({ title: "", description: "", memory_date: "", image_url: "" });
      setUploadedFiles([]);
      setShowCreateForm(false);
      setFabOpen(false);

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
      setFabOpen(false);

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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      handleFilesSelect(files);
    }
  };

  const handleFilesSelect = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      toast({
        title: "Some files skipped",
        description: "Only image files are supported",
        variant: "destructive"
      });
    }
    setUploadedFiles(prev => [...prev, ...imageFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const deleteItem = async () => {
    if (!selectedMemory && !selectedNote) return;

    setDeleting(true);
    try {
      if (selectedMemory) {
        // Delete images from storage first
        if (selectedMemory.images && selectedMemory.images.length > 0) {
          const filePaths = selectedMemory.images.map(img => {
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
          .eq('id', selectedMemory.id);

        if (deleteError) throw deleteError;
        setMemories(prev => prev.filter(m => m.id !== selectedMemory.id));
        setSelectedMemory(null);
      }

      if (selectedNote) {
        // Delete note from database
        const { error: deleteError } = await supabase
          .from('notes')
          .delete()
          .eq('id', selectedNote.id);

        if (deleteError) throw deleteError;
        setNotes(prev => prev.filter(n => n.id !== selectedNote.id));
        setSelectedNote(null);
      }

      setShowDeleteConfirm(false);

      toast({
        title: "Item Deleted",
        description: "The item has been permanently removed",
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
    }
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
      {/* Header */}
      <header className="bg-card p-6 pt-10 shadow-lg z-10 relative">
        <h1 className="text-3xl font-bold text-foreground mb-1">Memory Vault</h1>
        <p className="text-muted-foreground mb-4">Your love story collection</p>
        
        {/* Filter Pills */}
        <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2 mb-4" 
             style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'photos', label: 'Photos' },
            { id: 'notes', label: 'Notes' },
            { id: 'favorites', label: 'Favorites' }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setFilterType(filter.id as any)}
              className={`px-4 py-1.5 rounded-full whitespace-nowrap font-semibold text-sm transition-all ${
                filterType === filter.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* View Toggle - Repositioned */}
        <div className="absolute top-6 right-6 z-20 flex border border-border rounded-full p-1 bg-background/80 backdrop-blur-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-full transition-colors ${
              viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            <Grid3X3 size={18} />
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`p-1.5 rounded-full transition-colors ${
              viewMode === 'timeline' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            <List size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-6 relative">
        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="columns-2 gap-2 space-y-0">
            {filteredItems.map((item, index) => {
              // Dynamic heights for masonry effect
              const cardHeights = ['h-32', 'h-40', 'h-48', 'h-36', 'h-44', 'h-52'];
              const cardColors = [
                'bg-gradient-to-br from-blue-600 to-blue-800', 
                'bg-gradient-to-br from-red-500 to-red-700',
                'bg-gradient-to-br from-yellow-500 to-orange-600',
                'bg-gradient-to-br from-purple-500 to-purple-700',
                'bg-gradient-to-br from-green-500 to-green-700',
                'bg-gradient-to-br from-pink-500 to-pink-700'
              ];
              
              const randomHeight = cardHeights[index % cardHeights.length];
              const randomColor = cardColors[index % cardColors.length];
              
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="break-inside-avoid mb-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer"
                  onClick={() => {
                    if (item.type === 'memory') {
                      setSelectedMemory(item as Memory);
                    } else {
                      setSelectedNote(item as Note);
                    }
                  }}
                >
                  {item.type === 'memory' && (item as Memory).images && (item as Memory).images!.length > 0 ? (
                    <div className={`relative ${randomHeight} rounded-2xl overflow-hidden group`}>
                      <img
                        src={(item as Memory).images![0].image_url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item.id, 'memory', item.is_favorite);
                        }}
                        className="absolute top-3 right-3 transition-all duration-200 hover:scale-110"
                      >
                        <Star 
                          size={16} 
                          className={item.is_favorite ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg' : 'text-white/80 hover:text-yellow-400'} 
                        />
                      </button>
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-white font-semibold text-sm leading-tight drop-shadow-lg">{item.title}</p>
                        {(item as Memory).description && (
                          <p className="text-white/80 text-xs mt-1 line-clamp-2">{(item as Memory).description}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className={`${randomColor} ${randomHeight} rounded-2xl relative p-4 text-white group transition-all duration-300 hover:shadow-xl`}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item.id, item.type, item.is_favorite);
                        }}
                        className="absolute top-3 right-3 transition-all duration-200 hover:scale-110"
                      >
                        <Star 
                          size={16} 
                          className={item.is_favorite ? 'fill-yellow-300 text-yellow-300' : 'text-white/80 hover:text-yellow-300'} 
                        />
                      </button>
                      
                      <div className="flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                          {item.type === 'note' ? (
                            <FileText size={16} className="text-white/90" />
                          ) : (
                            <ImageIcon size={16} className="text-white/90" />
                          )}
                        </div>
                        
                        <h3 className="font-bold text-lg leading-tight mb-2 pr-6">{item.title}</h3>
                        
                        {item.type === 'note' && (item as Note).content && (
                          <p className="text-white/80 text-sm line-clamp-3 flex-grow">{(item as Note).content}</p>
                        )}
                        
                        <div className="mt-auto">
                          <p className="text-white/70 text-xs">
                            {item.type === 'memory' && (item as Memory).memory_date 
                              ? formatDate((item as Memory).memory_date!) 
                              : formatDate(item.created_at)
                            }
                          </p>
                        </div>
                      </div>
                      
                      {/* Subtle overlay for depth */}
                      <div className="absolute inset-0 bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
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
                <div
                  className="bg-card p-4 rounded-xl shadow-soft cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => {
                    if (item.type === 'memory') {
                      setSelectedMemory(item as Memory);
                    } else {
                      setSelectedNote(item as Note);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {item.type === 'note' ? (
                        <FileText size={16} className="text-primary" />
                      ) : (
                        <ImageIcon size={16} className="text-primary" />
                      )}
                      <p className="font-medium text-foreground">{item.title}</p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id, item.type, item.is_favorite);
                      }}
                      className="text-muted-foreground hover:text-accent transition-colors"
                    >
                      <Star 
                        size={16} 
                        className={item.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'} 
                      />
                    </button>
                  </div>
                  {item.type === 'memory' && (item as Memory).description && (
                    <p className="text-muted-foreground mt-1 text-sm">{(item as Memory).description}</p>
                  )}
                  {item.type === 'note' && (item as Note).content && (
                    <p className="text-muted-foreground mt-1 text-sm line-clamp-2">{(item as Note).content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Heart size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No {filterType === 'all' ? 'items' : filterType} found. Start creating your love story!</p>
          </div>
        )}

        {/* Floating Action Button */}
        <div className="fixed bottom-24 right-6 z-20" onClick={(e) => e.stopPropagation()}>
          {/* FAB Menu Items */}
          <div className={`flex flex-col items-center space-y-3 mb-3 transition-all duration-300 ${
            fabOpen ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-5 pointer-events-none'
          }`}>
            <button
              onClick={() => {
                setCreateMode('note');
                setShowCreateForm(true);
                setFabOpen(false);
              }}
              className="bg-card w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-100"
              title="Add Note"
            >
              <FileText size={24} className="text-foreground" />
            </button>
            <button
              onClick={() => {
                setCreateMode('photo');
                setShowCreateForm(true);
                setFabOpen(false);
              }}
              className="bg-card w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-100"
              title="Add Photo"
            >
              <Camera size={24} className="text-foreground" />
            </button>
          </div>
          
          {/* Main FAB */}
          <button
            onClick={() => setFabOpen(!fabOpen)}
            className={`bg-primary w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-100 ${
              fabOpen ? 'rotate-45' : ''
            }`}
          >
            <Plus size={32} className="text-primary-foreground" />
          </button>
        </div>
      </main>

      {/* Memory Detail Modal */}
      <Dialog open={!!selectedMemory} onOpenChange={() => setSelectedMemory(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          {selectedMemory && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <ImageIcon size={20} />
                  {selectedMemory.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedMemory.images && selectedMemory.images.length > 0 && (
                  <div className="space-y-2">
                    {selectedMemory.images.map((image) => (
                      <div key={image.id} className="relative">
                        <img
                          src={image.image_url}
                          alt={selectedMemory.title}
                          className="w-full rounded-lg object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {selectedMemory.description && (
                  <p className="text-muted-foreground">{selectedMemory.description}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {selectedMemory.memory_date 
                    ? formatDate(selectedMemory.memory_date) 
                    : formatDate(selectedMemory.created_at)
                  }
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
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 size={16} className="mr-1" />
                    Delete
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
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 size={16} className="mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedMemory ? 'Memory' : 'Note'}</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this {selectedMemory ? 'memory' : 'note'}? This action cannot be undone.</p>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={deleteItem}
              variant="destructive"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={createMode === 'photo' ? newMemory.title : newNote.title}
                onChange={(e) => {
                  if (createMode === 'photo') {
                    setNewMemory({ ...newMemory, title: e.target.value });
                  } else {
                    setNewNote({ ...newNote, title: e.target.value });
                  }
                }}
                placeholder={`What's this ${createMode === 'photo' ? 'memory' : 'note'} about?`}
              />
            </div>

            {createMode === 'photo' ? (
              <>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newMemory.description}
                    onChange={(e) => setNewMemory({ ...newMemory, description: e.target.value })}
                    placeholder="Tell the story..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="memory_date">Date</Label>
                  <Input
                    id="memory_date"
                    type="date"
                    value={newMemory.memory_date}
                    onChange={(e) => setNewMemory({ ...newMemory, memory_date: e.target.value })}
                  />
                </div>
                
                {/* File Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive ? 'border-primary bg-primary/5' : 'border-border'
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
                    onChange={(e) => handleFilesSelect(Array.from(e.target.files || []))}
                    className="hidden"
                  />
                  
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag & drop images here, or click to select
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={triggerFileInput}
                  >
                    Choose Files
                  </Button>
                </div>

                {/* Uploaded Files Preview */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Images ({uploadedFiles.length})</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => removeFile(index)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  placeholder="Write your note here..."
                  rows={6}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={createMode === 'photo' ? createMemory : createNote} 
                disabled={uploading} 
                className="flex-1"
              >
                {uploading ? "Creating..." : `Create ${createMode === 'photo' ? 'Memory' : 'Note'}`}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};