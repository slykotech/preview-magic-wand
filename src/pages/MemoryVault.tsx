import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Plus, Heart, Camera, X, Star, Upload, Image as ImageIcon, Grid3X3, List, Edit, Trash2 } from "lucide-react";
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

export const MemoryVault = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [newMemory, setNewMemory] = useState({
    title: "",
    description: "",
    memory_date: "",
    image_url: ""
  });
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'photos' | 'notes' | 'favorites'>('all');
  const [fabOpen, setFabOpen] = useState(false);
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
        await fetchMemories(coupleData.id);
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

  const deleteMemory = async () => {
    if (!selectedMemory) return;

    setDeleting(true);
    try {
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

      // Delete memory images from database (will cascade)
      const { error: deleteError } = await supabase
        .from('memories')
        .delete()
        .eq('id', selectedMemory.id);

      if (deleteError) throw deleteError;

      // Update memories list
      setMemories(prev => prev.filter(m => m.id !== selectedMemory.id));
      
      setSelectedMemory(null);
      setShowDeleteConfirm(false);

      toast({
        title: "Memory Deleted",
        description: "The memory has been permanently removed",
      });
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast({
        title: "Error",
        description: "Failed to delete memory",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredMemories = memories.filter(memory => {
    const matchesSearch = memory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (memory.description && memory.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterType === 'all') return matchesSearch;
    if (filterType === 'photos') return matchesSearch && memory.images && memory.images.length > 0;
    if (filterType === 'notes') return matchesSearch && (!memory.images || memory.images.length === 0);
    if (filterType === 'favorites') return matchesSearch; // TODO: Add favorites functionality
    
    return matchesSearch;
  });

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
        
        <div className="flex justify-between items-center">
          {/* Filter Pills */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
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

          {/* View Toggle */}
          <div className="flex border border-border rounded-full p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-full transition-colors ${
                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              <Grid3X3 size={20} />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded-full transition-colors ${
                viewMode === 'timeline' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-6 relative">
        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-2 gap-4">
            {filteredMemories.map((memory) => (
              <div
                key={memory.id}
                className="break-inside-avoid mb-4 transition-transform hover:scale-105 cursor-pointer"
                onClick={() => setSelectedMemory(memory)}
              >
                {memory.images && memory.images.length > 0 ? (
                  <img
                    src={memory.images[0].image_url}
                    alt={memory.title}
                    className="rounded-2xl w-full object-cover"
                    style={{ aspectRatio: `${Math.random() * 0.5 + 1}` }}
                  />
                ) : (
                  <div className="bg-card p-4 rounded-2xl relative shadow-soft">
                    <button className="absolute top-3 right-3 text-muted-foreground hover:text-accent transition-colors">
                      <Star size={20} />
                    </button>
                    <p className="text-foreground pr-6 font-medium">{memory.title}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {memory.memory_date ? formatDate(memory.memory_date) : formatDate(memory.created_at)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-1 bg-border rounded-full"></div>
            {filteredMemories.map((memory, index) => (
              <div key={memory.id} className="relative pl-12 mb-8">
                <div className="absolute left-2 top-1 h-5 w-5 border-4 border-background bg-primary rounded-full"></div>
                <p className="text-sm text-muted-foreground mb-1">
                  {memory.memory_date ? formatDate(memory.memory_date) : formatDate(memory.created_at)}
                </p>
                <div
                  className="bg-card p-4 rounded-xl shadow-soft cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => setSelectedMemory(memory)}
                >
                  <p className="font-medium text-foreground">{memory.title}</p>
                  {memory.description && (
                    <p className="text-muted-foreground mt-1 text-sm">{memory.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredMemories.length === 0 && (
          <div className="text-center py-12">
            <Heart size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No memories found. Start creating your love story!</p>
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
                setShowCreateForm(true);
                setFabOpen(false);
              }}
              className="bg-card w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-100"
              title="Add Journal Entry"
            >
              <Edit size={24} className="text-foreground" />
            </button>
            <button
              onClick={() => {
                setShowCreateForm(true);
                setFabOpen(false);
                // Auto focus on file input when opened for photos
                setTimeout(() => triggerFileInput(), 100);
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
                <DialogTitle className="text-xl font-bold">{selectedMemory.title}</DialogTitle>
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
                    onClick={() => {
                      setEditingMemory(selectedMemory);
                      setNewMemory({
                        title: selectedMemory.title,
                        description: selectedMemory.description || "",
                        memory_date: selectedMemory.memory_date || "",
                        image_url: selectedMemory.image_url || ""
                      });
                      setShowEditForm(true);
                      setSelectedMemory(null);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Edit size={16} className="mr-1" />
                    Edit
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
            <DialogTitle>Delete Memory</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this memory? This action cannot be undone.</p>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={deleteMemory}
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

      {/* Create Memory Form */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Memory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newMemory.title}
                onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
                placeholder="What's this memory about?"
              />
            </div>
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

            <div className="flex gap-2">
              <Button onClick={createMemory} disabled={uploading} className="flex-1">
                {uploading ? "Creating..." : "Create Memory"}
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