import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Plus, Heart, Camera, X, Star, Upload, Image as ImageIcon } from "lucide-react";
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

      toast({
        title: "Memory Created! 💕",
        description: `Your special moment with ${uploadedFiles.length} ${uploadedFiles.length === 1 ? 'image' : 'images'} has been saved`,
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

  const startEdit = (memory: Memory) => {
    setEditingMemory(memory);
    setNewMemory({
      title: memory.title,
      description: memory.description || "",
      memory_date: memory.memory_date || "",
      image_url: memory.image_url || ""
    });
    setUploadedFiles([]);
    setShowEditForm(true);
    setSelectedMemory(null);
  };

  const updateMemory = async () => {
    if (!editingMemory || !newMemory.title.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter at least a title for your memory",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update the memory
      const { error: memoryError } = await supabase
        .from('memories')
        .update({
          title: newMemory.title,
          description: newMemory.description || null,
          memory_date: newMemory.memory_date || null,
        })
        .eq('id', editingMemory.id);

      if (memoryError) throw memoryError;

      // Upload new images if files are selected
      if (uploadedFiles.length > 0) {
        const uploadResults = await uploadImages(uploadedFiles);
        
        // Get current max upload order
        const { data: existingImages } = await supabase
          .from('memory_images')
          .select('upload_order')
          .eq('memory_id', editingMemory.id)
          .order('upload_order', { ascending: false })
          .limit(1);

        const maxOrder = existingImages && existingImages.length > 0 ? existingImages[0].upload_order : -1;

        // Insert new memory images
        const memoryImages = uploadResults.map((result, index) => ({
          memory_id: editingMemory.id,
          image_url: result.url,
          file_name: result.fileName,
          upload_order: maxOrder + 1 + index
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
        .eq('id', editingMemory.id)
        .single();

      // Update memories list
      setMemories(prev => prev.map(m => m.id === editingMemory.id ? updatedMemory : m));
      
      setNewMemory({ title: "", description: "", memory_date: "", image_url: "" });
      setUploadedFiles([]);
      setEditingMemory(null);
      setShowEditForm(false);

      toast({
        title: "Memory Updated! 💕",
        description: "Your changes have been saved",
      });
    } catch (error) {
      console.error('Error updating memory:', error);
      toast({
        title: "Error",
        description: "Failed to update memory",
        variant: "destructive"
      });
    }
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

  const removeImageFromMemory = async (imageId: string, imageUrl: string) => {
    try {
      // Delete from storage
      const url = new URL(imageUrl);
      const filePath = url.pathname.split('/').pop();
      if (filePath) {
        await supabase.storage
          .from('memory-images')
          .remove([filePath]);
      }

      // Delete from database
      await supabase
        .from('memory_images')
        .delete()
        .eq('id', imageId);

      // Update selected memory if it's open
      if (selectedMemory) {
        const updatedImages = selectedMemory.images?.filter(img => img.id !== imageId) || [];
        setSelectedMemory({
          ...selectedMemory,
          images: updatedImages
        });
      }

      // Update memories list
      setMemories(prev => prev.map(memory => {
        if (memory.id === selectedMemory?.id) {
          return {
            ...memory,
            images: memory.images?.filter(img => img.id !== imageId) || []
          };
        }
        return memory;
      }));

      toast({
        title: "Image Removed",
        description: "The image has been deleted",
      });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: "Error",
        description: "Failed to remove image",
        variant: "destructive"
      });
    }
  };

  const filteredMemories = memories.filter(memory =>
    memory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (memory.description && memory.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      <div className="bg-gradient-romance text-white p-6 shadow-romantic">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <Heart size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold font-poppins">Memory Vault</h1>
              <p className="text-white/80 text-sm font-inter font-bold">Your love story collection</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-white/20 hover:bg-white/30 border-white/30"
            variant="outline"
            size="sm"
          >
            <Plus size={16} className="mr-1" />
            Add
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search your memories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-4 pr-4 py-3 rounded-xl border-muted font-inter"
          />
        </div>

        {/* Memory Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-4 text-center shadow-soft">
            <p className="text-2xl font-extrabold font-poppins text-primary">{memories.length}</p>
            <p className="text-xs text-muted-foreground font-inter font-bold">Total Memories</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-soft">
            <p className="text-2xl font-extrabold font-poppins text-secondary">
              {memories.reduce((total, memory) => total + (memory.images?.length || (memory.image_url ? 1 : 0)), 0)}
            </p>
            <p className="text-xs text-muted-foreground font-inter font-bold">Photos</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-soft">
            <p className="text-2xl font-extrabold font-poppins text-accent">
              {new Date().getFullYear() - 2023}
            </p>
            <p className="text-xs text-muted-foreground font-inter font-bold">Years Together</p>
          </div>
        </div>

        {/* Memories Grid */}
        {filteredMemories.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="mx-auto text-muted-foreground mb-4" size={48} />
            <h3 className="text-lg font-bold text-foreground mb-2">No memories yet</h3>
            <p className="text-muted-foreground mb-4">Start creating your love story!</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus size={16} className="mr-2" />
              Add Your First Memory
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMemories.map((memory, index) => (
              <div
                key={memory.id}
                className="bg-card rounded-xl p-4 shadow-soft hover:shadow-romantic transition-all duration-200 cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => setSelectedMemory(memory)}
              >
                <div className="flex items-start gap-4 mb-3">
                  {/* Images or Icon */}
                  <div className="flex-shrink-0">
                    {(memory.images && memory.images.length > 0) || memory.image_url ? (
                      <div className="relative">
                        {memory.images && memory.images.length > 0 ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden">
                            <img 
                              src={memory.images[0].image_url} 
                              alt={memory.title}
                              className="w-full h-full object-cover"
                            />
                            {memory.images.length > 1 && (
                              <div className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {memory.images.length}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg overflow-hidden">
                            <img 
                              src={memory.image_url} 
                              alt={memory.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-sunrise-coral/20 text-sunrise-coral rounded-lg flex items-center justify-center">
                        <Camera size={24} />
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-poppins font-bold text-foreground">{memory.title}</h3>
                        <p className="text-sm text-muted-foreground font-inter font-semibold">
                          {memory.memory_date ? new Date(memory.memory_date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          }) : new Date(memory.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                      <Star className="text-gold-accent animate-pulse" size={20} fill="currentColor" />
                    </div>

                    <p className="text-muted-foreground font-inter text-sm leading-relaxed mb-3 line-clamp-2 font-medium">
                      {memory.description || 'A special memory'}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                        #memory
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Memory Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart size={20} />
              Create New Memory
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Our special moment..."
                value={newMemory.title}
                onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Tell the story of this memory..."
                value={newMemory.description}
                onChange={(e) => setNewMemory({ ...newMemory, description: e.target.value })}
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
            <div>
              <Label>Photos</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  dragActive ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && handleFilesSelect(Array.from(e.target.files))}
                  className="hidden"
                />
                {uploadedFiles.length > 0 ? (
                  <div className="space-y-3">
                    <ImageIcon className="mx-auto text-green-600" size={24} />
                    <p className="text-sm font-medium text-green-600">{uploadedFiles.length} files selected</p>
                    <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative bg-muted rounded p-2">
                          <p className="text-xs truncate">{file.name}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-destructive text-white hover:bg-destructive/80"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                          >
                            <X size={12} />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFiles([]);
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto text-muted-foreground" size={24} />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop multiple images here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, GIF up to 10MB each
                    </p>
                  </div>
                )}
              </div>
              
              {/* Alternative: URL input - REMOVED */}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={createMemory}
                className="flex-1"
                disabled={!newMemory.title.trim() || uploading}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading {uploadedFiles.length} files...
                  </>
                ) : (
                  'Create Memory'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Memory Detail Dialog */}
      {selectedMemory && (
        <Dialog open={!!selectedMemory} onOpenChange={() => setSelectedMemory(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full bg-sunrise-coral/20 text-sunrise-coral`}>
                    <Camera size={20} />
                  </div>
                  <div>
                    <DialogTitle className="text-left">{selectedMemory.title}</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedMemory.memory_date ? new Date(selectedMemory.memory_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : new Date(selectedMemory.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMemory(null)}
                >
                  <X size={16} />
                </Button>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              {/* Display multiple images */}
              {((selectedMemory.images && selectedMemory.images.length > 0) || selectedMemory.image_url) && (
                <div className="space-y-3">
                  {selectedMemory.images && selectedMemory.images.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {selectedMemory.images
                        .sort((a, b) => a.upload_order - b.upload_order)
                        .map((image, index) => (
                          <div key={image.id} className="relative group">
                            <div className="w-full h-64 bg-gradient-romance rounded-xl overflow-hidden">
                              <img 
                                src={image.image_url} 
                                alt={`${selectedMemory.title} - Image ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImageFromMemory(image.id, image.image_url)}
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        ))}
                    </div>
                  ) : selectedMemory.image_url && (
                    <div className="w-full h-64 bg-gradient-romance rounded-xl overflow-hidden">
                      <img 
                        src={selectedMemory.image_url} 
                        alt={selectedMemory.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-foreground font-inter leading-relaxed mb-6 font-medium">
                {selectedMemory.description || 'A special memory to cherish together.'}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                  #memory
                </span>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => startEdit(selectedMemory)}
                >
                  <Camera className="mr-2" size={16} />
                  Edit Memory
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <X className="mr-2" size={16} />
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        )}

      {/* Edit Memory Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart size={20} />
              Edit Memory
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                placeholder="Our special moment..."
                value={newMemory.title}
                onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Tell the story of this memory..."
                value={newMemory.description}
                onChange={(e) => setNewMemory({ ...newMemory, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-memory_date">Date</Label>
              <Input
                id="edit-memory_date"
                type="date"
                value={newMemory.memory_date}
                onChange={(e) => setNewMemory({ ...newMemory, memory_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Add More Photos</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  dragActive ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && handleFilesSelect(Array.from(e.target.files))}
                  className="hidden"
                />
                {uploadedFiles.length > 0 ? (
                  <div className="space-y-3">
                    <ImageIcon className="mx-auto text-green-600" size={24} />
                    <p className="text-sm font-medium text-green-600">{uploadedFiles.length} new files selected</p>
                    <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative bg-muted rounded p-2">
                          <p className="text-xs truncate">{file.name}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-destructive text-white hover:bg-destructive/80"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                          >
                            <X size={12} />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFiles([]);
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto text-muted-foreground" size={24} />
                    <p className="text-sm text-muted-foreground">
                      Add more images to this memory
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, GIF up to 10MB each
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditForm(false);
                  setUploadedFiles([]);
                  setEditingMemory(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={updateMemory}
                className="flex-1"
                disabled={!newMemory.title.trim() || uploading}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Memory'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <X size={20} />
              Delete Memory
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-foreground">
              Are you sure you want to delete "<strong>{selectedMemory?.title}</strong>"? 
            </p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. All images associated with this memory will also be permanently deleted.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={deleteMemory}
                className="flex-1"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Forever'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};