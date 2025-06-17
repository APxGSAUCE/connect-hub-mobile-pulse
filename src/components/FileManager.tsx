
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Upload, Download, File, FileText, Image, Video, Search, Filter, Trash2, Eye, Share } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileItem {
  id: string;
  name: string;
  type: 'document' | 'image' | 'video' | 'other';
  size: string;
  uploadedBy: string;
  uploadDate: string;
  category: string;
  url?: string;
}

const FileManager = () => {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: '1',
      name: 'Project_Proposal_2024.pdf',
      type: 'document',
      size: '2.5 MB',
      uploadedBy: 'Sarah Johnson',
      uploadDate: '2024-01-15',
      category: 'Documents'
    },
    {
      id: '2',
      name: 'Team_Photo_Retreat.jpg',
      type: 'image',
      size: '1.8 MB',
      uploadedBy: 'Mike Wilson',
      uploadDate: '2024-01-14',
      category: 'Images'
    },
    {
      id: '3',
      name: 'Training_Video_Q1.mp4',
      type: 'video',
      size: '45.2 MB',
      uploadedBy: 'HR Department',
      uploadDate: '2024-01-12',
      category: 'Training'
    },
    {
      id: '4',
      name: 'Budget_Spreadsheet.xlsx',
      type: 'document',
      size: '892 KB',
      uploadedBy: 'John Doe',
      uploadDate: '2024-01-10',
      category: 'Finance'
    }
  ]);

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    category: 'Documents'
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUpload = () => {
    if (!uploadForm.file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    const fileExtension = uploadForm.file.name.split('.').pop()?.toLowerCase();
    let fileType: FileItem['type'] = 'other';
    
    if (['pdf', 'doc', 'docx', 'txt', 'xlsx', 'pptx'].includes(fileExtension || '')) {
      fileType = 'document';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(fileExtension || '')) {
      fileType = 'image';
    } else if (['mp4', 'avi', 'mov', 'wmv'].includes(fileExtension || '')) {
      fileType = 'video';
    }

    const newFile: FileItem = {
      id: Date.now().toString(),
      name: uploadForm.file.name,
      type: fileType,
      size: formatFileSize(uploadForm.file.size),
      uploadedBy: 'John Doe', // Current user
      uploadDate: new Date().toISOString().split('T')[0],
      category: uploadForm.category
    };

    setFiles([newFile, ...files]);
    setUploadForm({ file: null, category: 'Documents' });
    setIsUploadDialogOpen(false);

    toast({
      title: "Success",
      description: `File "${uploadForm.file.name}" uploaded successfully!`,
    });
  };

  const handleDownload = (file: FileItem) => {
    // In a real app, this would trigger an actual download
    toast({
      title: "Download Started",
      description: `Downloading ${file.name}...`,
    });
  };

  const handleDelete = (fileId: string) => {
    setFiles(files.filter(f => f.id !== fileId));
    toast({
      title: "File Deleted",
      description: "File has been removed successfully",
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="w-8 h-8 text-blue-600" />;
      case 'image': return <Image className="w-8 h-8 text-green-600" />;
      case 'video': return <Video className="w-8 h-8 text-purple-600" />;
      default: return <File className="w-8 h-8 text-gray-600" />;
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'document': return 'bg-blue-100 text-blue-800';
      case 'image': return 'bg-green-100 text-green-800';
      case 'video': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const categories = ['All', ...Array.from(new Set(files.map(f => f.category)))];

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const fileStats = {
    total: files.length,
    documents: files.filter(f => f.type === 'document').length,
    images: files.filter(f => f.type === 'image').length,
    videos: files.filter(f => f.type === 'video').length
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">File Manager</h2>
          <p className="text-gray-600">Upload, organize, and share files with your team</p>
        </div>

        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Upload New File</DialogTitle>
              <DialogDescription>
                Choose a file to upload and share with your team
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="file">Select File *</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileUpload}
                  accept="*/*"
                />
                {uploadForm.file && (
                  <p className="text-sm text-gray-600">
                    Selected: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="Documents">Documents</option>
                  <option value="Images">Images</option>
                  <option value="Training">Training</option>
                  <option value="Finance">Finance</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* File Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <File className="w-6 h-6 text-gray-600" />
              <div>
                <p className="text-2xl font-bold">{fileStats.total}</p>
                <p className="text-sm text-gray-600">Total Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{fileStats.documents}</p>
                <p className="text-sm text-gray-600">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Image className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{fileStats.images}</p>
                <p className="text-sm text-gray-600">Images</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Video className="w-6 h-6 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{fileStats.videos}</p>
                <p className="text-sm text-gray-600">Videos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border rounded-md"
        >
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* File List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFiles.map((file) => (
          <Card key={file.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {getFileIcon(file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={getFileTypeColor(file.type)} variant="secondary">
                      {file.type}
                    </Badge>
                    <span className="text-xs text-gray-500">{file.size}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    <p>Uploaded by {file.uploadedBy}</p>
                    <p>{file.uploadDate}</p>
                    <p>Category: {file.category}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleDownload(file)}>
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  <Button size="sm" variant="outline">
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                </div>
                <div className="flex space-x-1">
                  <Button size="sm" variant="ghost">
                    <Share className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleDelete(file.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFiles.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || selectedCategory !== 'All' ? 'No files found' : 'No files uploaded yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCategory !== 'All' 
                ? 'Try adjusting your search or filter criteria'
                : 'Upload your first file to get started'
              }
            </p>
            {!searchTerm && selectedCategory === 'All' && (
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Upload File
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileManager;
