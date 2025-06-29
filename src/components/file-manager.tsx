import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Upload,
  Download,
  Trash2,
  MoreVertical,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  HardDrive,
  Building,
  Database,
  Layers,
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import {
  fileStorage,
  StoredFile,
  UploadProgress,
  formatFileSize,
  getFileIcon,
} from "@/lib/file-storage";

interface FileManagerProps {
  onFileSelect?: (file: StoredFile) => void;
  allowUpload?: boolean;
  allowDelete?: boolean;
  showStorageUsage?: boolean;
}

function FileManager({
  onFileSelect,
  allowUpload = true,
  allowDelete = true,
  showStorageUsage = true,
}: FileManagerProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null,
  );
  const [storageUsage, setStorageUsage] = useState({
    totalSize: 0,
    fileCount: 0,
  });
  const [selectedFile, setSelectedFile] = useState<StoredFile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Load files on component mount
  useEffect(() => {
    if (user) {
      loadFiles();
      if (showStorageUsage) {
        loadStorageUsage();
      }
    }
  }, [user, showStorageUsage]);

  const loadFiles = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      const userFiles = await fileStorage.getUserFiles(user.id);
      setFiles(userFiles);
    } catch (error) {
      console.error("Failed to load files:", error);
      setError(error instanceof Error ? error.message : "Failed to load files");
    } finally {
      setIsLoading(false);
    }
  };

  const loadStorageUsage = async () => {
    if (!user) return;

    try {
      const usage = await fileStorage.getStorageUsage(user.id);
      setStorageUsage(usage);
    } catch (error) {
      console.error("Failed to load storage usage:", error);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploading(true);
      setError(null);

      const storedFile = await fileStorage.uploadFile(
        file,
        user.id,
        undefined,
        (progress) => {
          setUploadProgress(progress);
        },
      );

      // Refresh files list
      await loadFiles();
      if (showStorageUsage) {
        await loadStorageUsage();
      }

      // Clear upload progress
      setUploadProgress(null);

      // Reset file input
      event.target.value = "";

      // Notify parent component
      if (onFileSelect) {
        onFileSelect(storedFile);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setError(error instanceof Error ? error.message : "Upload failed");
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDownload = async (file: StoredFile) => {
    try {
      const blob = await fileStorage.downloadFile(file.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      setError(error instanceof Error ? error.message : "Download failed");
    }
  };

  const handleFileDelete = async (file: StoredFile) => {
    if (!user) return;

    try {
      await fileStorage.deleteFile(file.id, user.id);
      await loadFiles();
      if (showStorageUsage) {
        await loadStorageUsage();
      }
      setIsDeleteDialogOpen(false);
      setSelectedFile(null);
    } catch (error) {
      console.error("Delete failed:", error);
      setError(error instanceof Error ? error.message : "Delete failed");
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "SUCCESS":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "FAILED":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "PENDING":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case "STAAD":
        return <Building className="w-4 h-4 text-blue-600" />;
      case "SAP2000":
        return <Layers className="w-4 h-4 text-green-600" />;
      case "JSON":
        return <Database className="w-4 h-4 text-purple-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  // Filter files based on search term and type
  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "ALL" || file.metadata?.fileType === filterType;
    return matchesSearch && matchesType;
  });

  const fileTypes = ["ALL", "STAAD", "SAP2000", "JSON", "OTHER"];

  return (
    <div className="space-y-6 bg-white">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <HardDrive className="w-5 h-5" />
                <span>File Manager</span>
              </CardTitle>
              <CardDescription>
                Manage your structural model files and project data
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadFiles}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              {allowUpload && (
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".std,.s2k,.sdb,.json"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <Button
                    onClick={() =>
                      document.getElementById("file-upload")?.click()
                    }
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : "Upload File"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Storage Usage */}
        {showStorageUsage && (
          <CardContent className="pt-0">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Storage Usage</span>
                <span className="text-sm text-gray-600">
                  {formatFileSize(storageUsage.totalSize)} used
                </span>
              </div>
              <Progress
                value={(storageUsage.totalSize / (100 * 1024 * 1024)) * 100}
                className="h-2"
              />
              <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                <span>{storageUsage.fileCount} files</span>
                <span>100 MB limit</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Upload Progress */}
      {uploadProgress && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {uploadProgress.message}
                </span>
                <span className="text-sm text-gray-600">
                  {uploadProgress.percentage}%
                </span>
              </div>
              <Progress value={uploadProgress.percentage} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {fileTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === "ALL" ? "All Files" : type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Loading files...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterType !== "ALL"
                  ? "No files match your search"
                  : "No files uploaded"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterType !== "ALL"
                  ? "Try adjusting your search terms or filters"
                  : "Upload your first structural model file to get started"}
              </p>
              {allowUpload && !searchTerm && filterType === "ALL" && (
                <Button
                  onClick={() =>
                    document.getElementById("file-upload")?.click()
                  }
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow
                    key={file.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => onFileSelect?.(file)}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {getFileTypeIcon(file.metadata?.fileType || "OTHER")}
                        <div>
                          <div className="font-medium">{file.name}</div>
                          {file.metadata?.modelInfo && (
                            <div className="text-xs text-gray-600">
                              {file.metadata.modelInfo.nodes} nodes,{" "}
                              {file.metadata.modelInfo.members} members
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {file.metadata?.fileType || "OTHER"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatFileSize(file.size)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(file.metadata?.parsingStatus)}
                        <span className="text-sm capitalize">
                          {file.metadata?.parsingStatus?.toLowerCase() ||
                            "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {file.uploadedAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileDownload(file);
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          {allowDelete && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(file);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedFile?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedFile && handleFileDelete(selectedFile)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FileManager;
