import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BottomNavigation } from '@/components/BottomNavigation';
import { GradientHeader } from '@/components/GradientHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { useCoupleData } from '@/hooks/useCoupleData';
import { Heart, Search, Grid3X3, List, Star, Camera, Upload, Plus, Image as ImageIcon, FileText, Edit3, Trash2, MoreVertical, Eye } from 'lucide-react';

// Types
interface MemoryImage {
  id: string;
  image_url: string;
  file_name: string;
  upload_order: number;
}

interface Memory {
  id: string;
  title: string;
  description: string | null;
  memory_date: string | null;
  image_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  images?: MemoryImage[];
}

interface Note {
  id: string;
  title: string;
  content: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
}

interface UnifiedItem {
  id: string;
  title: string;
  description?: string | null;
  memory_date?: string | null;
  image_url?: string | null;
  content?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  type: 'memory' | 'note';
  images?: MemoryImage[];
}

const MemoryVault: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { coupleData, loading: coupleLoading } = useCoupleData();

  // State
  const [memories, setMemories] = useState<Memory[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'photos' | 'notes' | 'favorites'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createType, setCreateType] = useState<'memory' | 'note'>('memory');
  const [showFabOptions, setShowFabOptions] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [newMemory, setNewMemory] = useState({
    title: '',
    description: '',
    memory_date: '',
    image_url: ''
  });

  const [newNote, setNewNote] = useState({
    title: '',
    content: ''
  });

  // Fetch data
  const fetchMemories = useCallback(async () => {
    if (!coupleData?.id) return;

    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*, images:memory_images(*)')
        .eq('couple_id', coupleData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error('Error fetching memories:', error);
      toast({
        title: "Error",
        description: "Failed to load memories",
        variant: "destructive",
      });
    }
  }, [coupleData?.id, toast]);

  const fetchNotes = useCallback(async () => {
    if (!coupleData?.id) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('couple_id', coupleData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({
        title: "Error",
        description: "Failed to load notes",
        variant: "destructive",
      });
    }
  }, [coupleData?.id, toast]);

  useEffect(() => {
    if (coupleData?.id) {
      Promise.all([fetchMemories(), fetchNotes()]).finally(() => setLoading(false));
    }
  }, [coupleData?.id, fetchMemories, fetchNotes]);

  // Drag and drop handlers
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
      setUploadedFiles(files);
    }
  };

  const handleFilesSelect = (files: File[]) => {
    setUploadedFiles(files);
  };

  // Upload images to Supabase Storage
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
      return [];
    } finally {
      setUploading(false);
    }
  };

  // Create memory
  const createMemory = async () => {
    if (!coupleData?.id || !newMemory.title.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
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
          couple_id: coupleData.id,
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
        .select(`*, images:memory_images(*)`)
        .eq('id', memoryData.id)
        .single();

      setMemories([updatedMemory, ...memories]);
      
      // Reset form
      setNewMemory({ title: "", description: "", memory_date: "", image_url: "" });
      setUploadedFiles([]);
      setShowCreateForm(false);
      setShowFabOptions(false);
      
      toast({ title: "Memory Created! 💕" });
    } catch (error) {
      console.error('Error creating memory:', error);
      toast({ title: "Error", variant: "destructive" });
    }
  };

  // Create note
  const createNote = async () => {
    if (!coupleData?.id || !newNote.title.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields", 
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
          couple_id: coupleData.id,
          created_by: user?.id
        })
        .select()
        .single();

      if (noteError) throw noteError;

      setNotes([noteData, ...notes]);
      setNewNote({ title: "", content: "" });
      setShowCreateForm(false);
      setShowFabOptions(false);
      
      toast({ title: "Note Created! 📝" });
    } catch (error) {
      console.error('Error creating note:', error);
      toast({ title: "Error", variant: "destructive" });
    }
  };

  // Toggle favorite
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
        title: !currentState ? "Added to Favorites! ⭐" : "Removed from Favorites"
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({ title: "Error", variant: "destructive" });
    }
  };

  // Delete item
  const deleteItem = async () => {
    if (!selectedItem) return;

    setDeleting(true);
    try {
      if ('images' in selectedItem) {
        // It's a memory - delete images from storage first
        if (selectedItem.images && selectedItem.images.length > 0) {
          const filePaths = selectedItem.images.map(img => {
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
          .eq('id', selectedItem.id);

        if (deleteError) throw deleteError;
        setMemories(prev => prev.filter(m => m.id !== selectedItem.id));
      } else {
        // It's a note
        const { error: deleteError } = await supabase
          .from('notes')
          .delete()
          .eq('id', selectedItem.id);

        if (deleteError) throw deleteError;
        setNotes(prev => prev.filter(n => n.id !== selectedItem.id));
      }

      setSelectedItem(null);
      setShowDeleteDialog(false);
      toast({ title: "Item Deleted" });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  // Filter and search items
  const getFilteredItems = (): UnifiedItem[] => {
    const memoryItems: UnifiedItem[] = memories.map(memory => ({ ...memory, type: 'memory' as const }));
    const noteItems: UnifiedItem[] = notes.map(note => ({ ...note, type: 'note' as const }));
    
    let allItems = [...memoryItems, ...noteItems];

    // Apply filter
    if (filterType === 'photos') {
      allItems = allItems.filter(item => item.type === 'memory');
    } else if (filterType === 'notes') {
      allItems = allItems.filter(item => item.type === 'note');
    } else if (filterType === 'favorites') {
      allItems = allItems.filter(item => item.is_favorite);
    }

    // Apply search
    if (searchTerm) {
      allItems = allItems.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.type === 'note' && item.content && item.content.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Sort by created_at
    return allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const filteredItems = getFilteredItems();

  if (coupleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-r-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your memories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Gradient Header */}
      <GradientHeader 
        title="Memory Vault" 
        subtitle="Your love story collection" 
        icon={<Heart size={24} />} 
        showBackButton={false}
      />

      <div className="flex-1 container mx-auto px-6 space-y-6 mt-6">
        {/* Controls Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            {/* Filter Pills */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                className={`rounded-full whitespace-nowrap font-semibold ${
                  filterType === 'all' ? 'bg-primary hover:bg-primary/90' : ''
                }`}
                onClick={() => setFilterType('all')}
              >
                All
              </Button>
              <Button
                variant={filterType === 'photos' ? 'default' : 'outline'}
                size="sm"
                className={`rounded-full whitespace-nowrap font-semibold ${
                  filterType === 'photos' ? 'bg-primary hover:bg-primary/90' : ''
                }`}
                onClick={() => setFilterType('photos')}
              >
                Photos
              </Button>
              <Button
                variant={filterType === 'notes' ? 'default' : 'outline'}
                size="sm"
                className={`rounded-full whitespace-nowrap font-semibold ${
                  filterType === 'notes' ? 'bg-primary hover:bg-primary/90' : ''
                }`}
                onClick={() => setFilterType('notes')}
              >
                Notes
              </Button>
              <Button
                variant={filterType === 'favorites' ? 'default' : 'outline'}
                size="sm"
                className={`rounded-full whitespace-nowrap font-semibold ${
                  filterType === 'favorites' ? 'bg-primary hover:bg-primary/90' : ''
                }`}
                onClick={() => setFilterType('favorites')}
              >
                Favorites
              </Button>
            </div>

            {/* View Toggle */}
            <div className="flex border border-border rounded-full p-1">
              <Button
                variant="ghost"
                size="sm"
                className={`p-1.5 rounded-full ${
                  viewMode === 'grid' ? 'bg-foreground text-background' : 'text-muted-foreground'
                }`}
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`p-1.5 rounded-full ${
                  viewMode === 'timeline' ? 'bg-foreground text-background' : 'text-muted-foreground'
                }`}
                onClick={() => setViewMode('timeline')}
              >
                <List className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search your memories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="relative min-h-[60vh]">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No items found. Start creating your love story!
              </h3>
            </div>
          ) : viewMode === 'grid' ? (
            /* Masonry Grid View - Pinterest Style */
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
              {filteredItems.map((item, index) => {
                // Generate vibrant colors for memory cards to match reference
                const colors = [
                  'from-orange-400 to-orange-600', // Orange like in reference
                  'from-purple-500 to-purple-700', // Purple
                  'from-blue-500 to-blue-700',     // Blue  
                  'from-green-500 to-green-700',   // Green
                  'from-pink-500 to-pink-700',     // Pink
                  'from-teal-500 to-teal-700',     // Teal
                  'from-indigo-500 to-indigo-700', // Indigo
                  'from-red-500 to-red-700'        // Red
                ];
                const colorClass = colors[index % colors.length];
                
                return (
                  <div 
                    key={`${item.type}-${item.id}`} 
                    className="break-inside-avoid mb-4 cursor-pointer"
                  >
                    {item.type === 'memory' && item.images && item.images.length > 0 ? (
                      /* Photo Memory Card - Colorful like reference */
                <div 
                          className={`relative rounded-xl overflow-hidden bg-gradient-to-br ${colorClass} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer`}
                          onClick={() => {
                            setSelectedItem(item);
                            setShowViewDialog(true);
                          }}
                        >
                         <div className="relative">
                           <img 
                             src={item.images[0].image_url} 
                             alt={item.title} 
                             className="w-full object-cover" 
                             style={{ height: `${Math.floor(Math.random() * 100) + 200}px` }} // Variable heights like reference
                           />
                           
                           {/* Dark overlay for text readability */}
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                           
                           {/* Content overlay */}
                           <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                             <div className="flex items-start justify-between mb-1">
                               <div className="flex-1">
                                 <h3 className="font-semibold text-base leading-tight mb-1">{item.title}</h3>
                                 <p className="text-xs text-white/80">
                                   {item.memory_date ? format(parseISO(item.memory_date), 'MMM d, yyyy') : format(parseISO(item.created_at), 'MMM d, yyyy')}
                                 </p>
                               </div>
                               <div className="flex gap-1">
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     toggleFavorite(item.id, item.type, item.is_favorite);
                                   }}
                                   className="p-1 hover:bg-white/20 h-auto"
                                 >
                                   <Star className={`h-4 w-4 ${item.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-white/70'}`} />
                                 </Button>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setSelectedItem(item);
                                     setShowDeleteDialog(true);
                                   }}
                                   className="p-1 hover:bg-white/20 h-auto"
                                 >
                                   <Trash2 className="h-4 w-4 text-white/70" />
                                 </Button>
                               </div>
                             </div>
                            
                            {item.description && item.description.length > 50 && (
                              <div>
                                <p className="text-xs text-white/90 line-clamp-3 mb-1">
                                  {item.description}
                                </p>
                                <button className="text-xs text-white/80 underline">Show less</button>
                              </div>
                            )}
                            
                            {item.description && item.description.length <= 50 && (
                              <p className="text-xs text-white/90">
                                {item.description}
                              </p>
                            )}
                          </div>

                          {/* Multiple photos indicator */}
                          {item.images.length > 1 && (
                            <div className="absolute top-3 left-3 bg-black/60 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                              <span>+{item.images.length - 1}</span>
                            </div>
                          )}
                          
                          {/* Favorite star in top right */}
                          {item.is_favorite && (
                            <div className="absolute top-3 right-3">
                              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Note Card - Clean white like reference */
                       <div 
                         className="bg-card rounded-xl p-4 shadow-sm border hover:shadow-md transition-all duration-300 cursor-pointer"
                         onClick={() => {
                           setSelectedItem(item);
                           setShowViewDialog(true);
                         }}
                       >
                         <div className="flex items-start justify-between mb-3">
                           <div className="flex-1">
                             <div className="flex items-center gap-2 mb-2">
                               <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                 <FileText className="h-3 w-3 text-primary" />
                               </div>
                             </div>
                             <h3 className="font-semibold text-foreground text-sm leading-tight mb-1">{item.title}</h3>
                             <p className="text-xs text-muted-foreground">
                               {format(parseISO(item.created_at), 'MMM d, yyyy')}
                             </p>
                           </div>
                           <div className="flex gap-1">
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 toggleFavorite(item.id, item.type, item.is_favorite);
                               }}
                               className="p-1 h-auto"
                             >
                               <Star className={`h-4 w-4 ${item.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                             </Button>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setSelectedItem(item);
                                 setShowDeleteDialog(true);
                               }}
                               className="p-1 h-auto"
                             >
                               <Trash2 className="h-4 w-4 text-muted-foreground" />
                             </Button>
                           </div>
                         </div>

                         {item.content && (
                           <div>
                             <p className="text-muted-foreground text-sm leading-relaxed line-clamp-4 mb-2">
                               {item.content}
                             </p>
                             {item.content.length > 100 && (
                               <button className="text-xs text-muted-foreground underline">Show less</button>
                             )}
                           </div>
                         )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Timeline View */
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-1 bg-border rounded-full"></div>
              <div className="space-y-6">
                {filteredItems.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="relative pl-12">
                    <div className="absolute left-2 top-2 h-5 w-5 border-4 border-background bg-primary rounded-full"></div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {format(parseISO(item.created_at), 'MMM d, yyyy')}
                    </p>
                    <Card className="p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-foreground">{item.title}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(item.id, item.type, item.is_favorite)}
                          className="p-1"
                        >
                          <Star className={`h-4 w-4 ${item.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                        </Button>
                      </div>
                      
                      {item.type === 'note' && item.content && (
                        <p className="text-muted-foreground">{item.content}</p>
                      )}
                      
                      {item.description && (
                        <p className="text-muted-foreground">{item.description}</p>
                      )}

                      {item.type === 'memory' && item.images && item.images.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {item.images.slice(0, 2).map((image, index) => (
                            <img 
                              key={image.id}
                              src={image.image_url} 
                              alt={`${item.title} ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg" 
                            />
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-24 right-6 z-20">
          <div className={`flex flex-col items-center space-y-3 mb-3 transition-all duration-300 ${
            showFabOptions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}>
            <Button 
              size="sm"
              className="bg-background w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-110"
              onClick={() => { 
                setCreateType('note'); 
                setShowCreateForm(true); 
                setShowFabOptions(false);
              }}
            >
              <Edit3 className="h-6 w-6 text-foreground" />
            </Button>
            <Button 
              size="sm"
              className="bg-background w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-110"
              onClick={() => { 
                setCreateType('memory'); 
                setShowCreateForm(true); 
                setShowFabOptions(false);
              }}
            >
              <Camera className="h-6 w-6 text-foreground" />
            </Button>
          </div>

          <Button 
            size="lg" 
            className={`bg-primary hover:bg-primary/90 w-16 h-16 rounded-full shadow-lg transition-all duration-300 ${
              showFabOptions ? 'rotate-45' : 'rotate-0'
            }`}
            onClick={() => setShowFabOptions(!showFabOptions)}
          >
            <Plus className="h-8 w-8" />
          </Button>
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{createType === 'memory' ? 'Create New Memory' : 'Create New Note'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              value={createType === 'memory' ? newMemory.title : newNote.title}
              onChange={(e) => {
                if (createType === 'memory') {
                  setNewMemory(prev => ({ ...prev, title: e.target.value }));
                } else {
                  setNewNote(prev => ({ ...prev, title: e.target.value }));
                }
              }}
              placeholder="Title"
            />

            {createType === 'memory' ? (
              <>
                <Textarea
                  value={newMemory.description}
                  onChange={(e) => setNewMemory(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description"
                />
                <Input
                  type="date"
                  value={newMemory.memory_date}
                  onChange={(e) => setNewMemory(prev => ({ ...prev, memory_date: e.target.value }))}
                />
                {/* Drag & Drop Upload Area */}
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag & drop images here or click to choose
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFilesSelect(Array.from(e.target.files))}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span>Choose Files</span>
                    </Button>
                  </label>
                  {uploadedFiles.length > 0 && (
                    <p className="text-xs text-primary mt-2">
                      {uploadedFiles.length} file(s) selected
                    </p>
                  )}
                </div>
              </>
            ) : (
              <Textarea
                value={newNote.content}
                onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Content"
                rows={4}
              />
            )}

            <div className="flex gap-2">
              <Button onClick={createType === 'memory' ? createMemory : createNote} disabled={uploading} className="flex-1">
                {uploading ? 'Uploading...' : createType === 'memory' ? 'Create Memory' : 'Create Note'}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Item Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedItem && ('images' in selectedItem ? 'Memory Details' : 'Note Details')}
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-foreground mb-2">{selectedItem.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    Created on {format(parseISO(selectedItem.created_at), 'MMMM d, yyyy')}
                  </p>
                  {('memory_date' in selectedItem) && selectedItem.memory_date && (
                    <p className="text-sm text-muted-foreground">
                      Memory from {format(parseISO(selectedItem.memory_date), 'MMMM d, yyyy')}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFavorite(selectedItem.id, 'images' in selectedItem ? 'memory' : 'note', selectedItem.is_favorite)}
                >
                  <Star className={`h-5 w-5 ${selectedItem.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                </Button>
              </div>

              {/* Images for memories */}
              {('images' in selectedItem) && selectedItem.images && selectedItem.images.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedItem.images.map((image) => (
                    <img 
                      key={image.id}
                      src={image.image_url} 
                      alt={selectedItem.title}
                      className="w-full h-64 object-cover rounded-lg" 
                    />
                  ))}
                </div>
              )}

              {/* Description/Content */}
              {('description' in selectedItem) && selectedItem.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground leading-relaxed">{selectedItem.description}</p>
                </div>
              )}

              {('content' in selectedItem) && selectedItem.content && (
                <div>
                  <h3 className="font-semibold mb-2">Content</h3>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedItem.content}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setShowViewDialog(false);
                    setShowDeleteDialog(true);
                  }}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowViewDialog(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {selectedItem && 'images' in selectedItem ? 'memory' : 'note'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteItem}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNavigation />
    </div>
  );
};

export default MemoryVault;