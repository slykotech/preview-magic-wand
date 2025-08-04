import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { useCoupleData } from '@/hooks/useCoupleData';
import { Heart, Search, Grid3X3, List, Star, Camera, Upload, Plus, Image as ImageIcon, FileText, Edit3, Trash2, MoreVertical, Eye, Calendar, Clock, Edit2, X, Images } from 'lucide-react';

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
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Memory Vault</h1>
              <p className="text-sm text-gray-500">Your love story collection</p>
            </div>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'timeline' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid3X3 className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white px-4 py-2 border-b sticky top-16 z-10">
          <div className="flex space-x-1">
            {(['all', 'photos', 'notes', 'favorites'] as const).map((filter) => (
              <Button
                key={filter}
                variant={filterType === filter ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterType(filter)}
                className="capitalize text-sm"
              >
                {filter === 'photos' && <Camera className="h-4 w-4 mr-1" />}
                {filter === 'notes' && <FileText className="h-4 w-4 mr-1" />}
                {filter === 'favorites' && <Star className="h-4 w-4 mr-1" />}
                {filter}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No items found. Start creating your love story!
              </h3>
            </div>
          ) : (
            <div className="columns-2 gap-2">
              {filteredItems.map((item) => 
                item.type === 'memory' ? (
                  <div key={item.id} className="break-inside-avoid mb-2">
                    <MobileMemoryCard
                      memory={item}
                    onView={() => {
                      setSelectedItem(item);
                      setShowViewDialog(true);
                    }}
                    onToggleFavorite={(id, currentState) => toggleFavorite(id, 'memory', currentState)}
                    onEdit={() => {
                      // TODO: Implement edit functionality
                    }}
                    onDelete={() => {
                      setSelectedItem(item);
                      setShowDeleteDialog(true);
                    }}
                    />
                  </div>
                ) : (
                  <div key={item.id} className="break-inside-avoid mb-2">
                    <MobileNoteCard
                      note={item}
                    onView={() => {
                      setSelectedItem(item);
                      setShowViewDialog(true);
                    }}
                    onToggleFavorite={(id, currentState) => toggleFavorite(id, 'note', currentState)}
                    onEdit={() => {
                      // TODO: Implement edit functionality
                    }}
                    onDelete={() => {
                      setSelectedItem(item);
                      setShowDeleteDialog(true);
                    }}
                    />
                  </div>
                )
              )}
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
      </div>

      <BottomNavigation />
    </>
  );
};

// Mobile Memory Card Component
const MobileMemoryCard: React.FC<{
  memory: UnifiedItem;
  onView: () => void;
  onToggleFavorite: (id: string, currentState: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ memory, onView, onToggleFavorite, onEdit, onDelete }) => {
  const firstImage = memory.images?.[0]?.image_url || memory.image_url;
  const totalImages = memory.images?.length || (memory.image_url ? 1 : 0);

  return (
    <Card 
      className="w-full overflow-hidden bg-white rounded-xl shadow-sm border-0"
      onClick={onView}
    >
      {firstImage && (
        <div className="relative h-48">
          <img
            src={firstImage}
            alt={memory.title}
            className="w-full h-full object-cover"
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/20" />
          
          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-white font-bold text-lg leading-tight drop-shadow-lg">
              {memory.title}
            </h3>
            {memory.description && (
              <p className="text-white/90 text-sm mt-1 drop-shadow">
                Visited {memory.description.split(' ').slice(0, 3).join(' ')}...
              </p>
            )}
          </div>
          
          {/* Multiple photos indicator */}
          {totalImages > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center">
              <Images className="h-3 w-3 mr-1" />
              +{totalImages - 1}
            </div>
          )}
          
          {/* Action buttons */}
          <div className="absolute top-3 right-3 flex space-x-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(memory.id, memory.is_favorite);
              }}
              className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
            >
              <Star className={`h-4 w-4 ${memory.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
            </Button>
          </div>
        </div>
      )}
      
      {!firstImage && (
        <div className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 mb-1">
                {memory.title}
              </h3>
              {memory.description && (
                <p className="text-gray-600 text-sm line-clamp-3 mb-2">
                  {memory.description}
                </p>
              )}
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="h-3 w-3 mr-1" />
                {memory.memory_date ? format(new Date(memory.memory_date), 'MMM d, yyyy') : format(new Date(memory.created_at), 'MMM d, yyyy')}
              </div>
            </div>
            <div className="flex space-x-1 ml-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(memory.id, memory.is_favorite);
                }}
                className="h-8 w-8 p-0"
              >
                <Star className={`h-4 w-4 ${memory.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="h-4 w-4 text-gray-400" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4 text-gray-400" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

// Mobile Note Card Component
const MobileNoteCard: React.FC<{
  note: UnifiedItem;
  onView: () => void;
  onToggleFavorite: (id: string, currentState: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ note, onView, onToggleFavorite, onEdit, onDelete }) => {
  const shouldTruncate = note.content && note.content.length > 150;

  return (
    <Card className="w-full bg-white rounded-xl shadow-sm border-0 overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-2">
              <FileText className="h-3 w-3 text-purple-600" />
            </div>
            <h3 className="font-bold text-lg text-gray-900">
              {note.title}
            </h3>
          </div>
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(note.id, note.is_favorite);
              }}
              className="h-8 w-8 p-0"
            >
              <Star className={`h-4 w-4 ${note.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-4 w-4 text-gray-400" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
        </div>
        
        {note.content && (
          <div className="mb-2">
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
              {note.content}
            </p>
            {shouldTruncate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
                className="text-purple-600 text-sm font-medium mt-1 hover:underline"
              >
                Read more
              </button>
            )}
          </div>
        )}
        
        <div className="flex items-center text-xs text-gray-500">
          <Calendar className="h-3 w-3 mr-1" />
          {format(new Date(note.created_at), 'MMM d, yyyy')}
        </div>
      </div>
    </Card>
  );
};

export default MemoryVault;