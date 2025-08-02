import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCoupleData } from '@/hooks/useCoupleData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/GradientHeader';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Heart, Search, Grid3X3, List, Star, Trash2, Camera, Upload, X, Calendar, Image as ImageIcon, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Data Models
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

type UnifiedItem = (Memory & { type: 'memory' }) | (Note & { type: 'note' });

const MemoryVault = () => {
  const { user } = useAuth();
  const { coupleData } = useCoupleData();
  const { toast } = useToast();

  // State Management
  const [memories, setMemories] = useState<Memory[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'photos' | 'notes' | 'favorites'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createType, setCreateType] = useState<'memory' | 'note'>('memory');
  const [newMemory, setNewMemory] = useState({ title: "", description: "", memory_date: "" });
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);

  const coupleId = coupleData?.id;

  // Data Fetching
  const fetchMemories = useCallback(async (couple_id: string) => {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select(`*, images:memory_images(*)`)
        .eq('couple_id', couple_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error('Error fetching memories:', error);
    }
  }, []);

  const fetchNotes = useCallback(async (couple_id: string) => {
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
  }, []);

  useEffect(() => {
    if (coupleId) {
      Promise.all([fetchMemories(coupleId), fetchNotes(coupleId)]).finally(() => setLoading(false));
    }
  }, [coupleId, fetchMemories, fetchNotes]);

  // File Upload Logic
  const uploadImages = async (files: File[]) => {
    setUploading(true);
    try {
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

        return { url: urlData.publicUrl, fileName: file.name };
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading images:', error);
      return [];
    } finally {
      setUploading(false);
    }
  };

  // CRUD Operations
  const createMemory = async () => {
    if (!coupleId || !newMemory.title.trim()) {
      toast({ title: "Missing information", variant: "destructive" });
      return;
    }

    try {
      const { data: memoryData, error } = await supabase
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

      if (error) throw error;

      if (uploadedFiles.length > 0) {
        const uploadResults = await uploadImages(uploadedFiles);
        const memoryImages = uploadResults.map((result, index) => ({
          memory_id: memoryData.id,
          image_url: result.url,
          file_name: result.fileName,
          upload_order: index
        }));

        await supabase.from('memory_images').insert(memoryImages);
      }

      await fetchMemories(coupleId);
      setNewMemory({ title: "", description: "", memory_date: "" });
      setUploadedFiles([]);
      setShowCreateForm(false);
      toast({ title: "Memory Created! 💕" });
    } catch (error) {
      console.error('Error creating memory:', error);
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const createNote = async () => {
    if (!coupleId || !newNote.title.trim()) return;

    try {
      await supabase.from('notes').insert({
        title: newNote.title,
        content: newNote.content || null,
        couple_id: coupleId,
        created_by: user?.id
      });

      await fetchNotes(coupleId);
      setNewNote({ title: "", content: "" });
      setShowCreateForm(false);
      toast({ title: "Note Created! 📝" });
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const toggleFavorite = async (id: string, type: 'memory' | 'note', currentState: boolean) => {
    try {
      await supabase
        .from(type === 'memory' ? 'memories' : 'notes')
        .update({ is_favorite: !currentState })
        .eq('id', id);

      if (type === 'memory') {
        setMemories(prev => prev.map(m => m.id === id ? { ...m, is_favorite: !currentState } : m));
      } else {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, is_favorite: !currentState } : n));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Filtering
  const getFilteredItems = () => {
    const allItems: UnifiedItem[] = [
      ...memories.map(m => ({ ...m, type: 'memory' as const })),
      ...notes.map(n => ({ ...n, type: 'note' as const }))
    ];

    return allItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <GradientHeader title="Memory Vault" subtitle="Your love story collection" />

      <div className="container mx-auto px-4 py-6 pb-24">
        {/* Search and Controls */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search memories and notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Tabs value={filterType} onValueChange={(value) => setFilterType(value as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="favorites">Favorites</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('timeline')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No items found. Start creating your love story!
            </h3>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4" : "space-y-4"}>
            {filteredItems.map((item) => (
              <Card key={`${item.type}-${item.id}`} className="break-inside-avoid overflow-hidden hover:shadow-lg transition-all">
                {item.type === 'memory' && item.images && item.images.length > 0 && (
                  <div className="relative">
                    <img src={item.images[0].image_url} alt={item.title} className="w-full h-48 object-cover" />
                    {item.images.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                        +{item.images.length - 1} more
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium line-clamp-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(item.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(item.id, item.type, item.is_favorite)}
                    >
                      <Star className={`h-4 w-4 ${item.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant={item.type === 'memory' ? 'default' : 'secondary'}>
                      {item.type === 'memory' ? (
                        <><ImageIcon className="h-3 w-3 mr-1" />Memory</>
                      ) : (
                        <><FileText className="h-3 w-3 mr-1" />Note</>
                      )}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* FAB */}
        <div className="fixed bottom-24 right-4 flex flex-col gap-2">
          <Button size="lg" className="rounded-full shadow-lg" onClick={() => { setCreateType('memory'); setShowCreateForm(true); }}>
            <Camera className="h-5 w-5 mr-2" />
            Add Memory
          </Button>
          <Button variant="outline" size="lg" className="rounded-full shadow-lg" onClick={() => { setCreateType('note'); setShowCreateForm(true); }}>
            <FileText className="h-5 w-5 mr-2" />
            Add Note
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
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && setUploadedFiles(Array.from(e.target.files))}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span>Choose Files</span>
                    </Button>
                  </label>
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

      <BottomNavigation />
    </div>
  );
};

export default MemoryVault;