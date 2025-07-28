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
}

export const MemoryVault = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMemory, setNewMemory] = useState({
    title: "",
    description: "",
    memory_date: "",
    image_url: ""
  });
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
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
        .select('*')
        .eq('couple_id', couple_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error('Error fetching memories:', error);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      
      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('memory-images')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('memory-images')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
      return null;
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
      let imageUrl = newMemory.image_url;
      
      // Upload image if file is selected
      if (uploadedFile) {
        imageUrl = await uploadImage(uploadedFile);
        if (!imageUrl) return; // Upload failed
      }

      const { data, error } = await supabase
        .from('memories')
        .insert({
          title: newMemory.title,
          description: newMemory.description || null,
          memory_date: newMemory.memory_date || null,
          image_url: imageUrl || null,
          couple_id: coupleId,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setMemories([data, ...memories]);
      setNewMemory({ title: "", description: "", memory_date: "", image_url: "" });
      setUploadedFile(null);
      setShowCreateForm(false);

      toast({
        title: "Memory Created! 💕",
        description: "Your special moment has been saved",
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.type.startsWith('image/')) {
      setUploadedFile(file);
      // Clear any URL input
      setNewMemory({ ...newMemory, image_url: "" });
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
              {memories.filter(m => m.image_url).length}
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
                  {/* Image or Icon */}
                  <div className="flex-shrink-0">
                    {memory.image_url ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden">
                        <img 
                          src={memory.image_url} 
                          alt={memory.title}
                          className="w-full h-full object-cover"
                        />
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
              <Label>Photo</Label>
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
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
                {uploadedFile ? (
                  <div className="space-y-2">
                    <ImageIcon className="mx-auto text-green-600" size={24} />
                    <p className="text-sm font-medium text-green-600">{uploadedFile.name}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFile(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto text-muted-foreground" size={24} />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop an image here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, GIF up to 10MB
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
                    Uploading...
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
              {selectedMemory.image_url && (
                <div className="w-full h-64 bg-gradient-romance rounded-xl overflow-hidden">
                  <img 
                    src={selectedMemory.image_url} 
                    alt={selectedMemory.title}
                    className="w-full h-full object-cover"
                  />
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
                <Button variant="romantic" className="flex-1">
                  <Heart className="mr-2" size={16} />
                  Add to Favorites
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