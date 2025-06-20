import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, Trash2, Calendar, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  type: "staad" | "sap2000";
  buildingType: string;
  status: "completed" | "in-progress" | "failed";
  createdAt: string;
  lastModified: string;
  loadTypes: string[];
  fileSize: string;
}

function ProjectHistory() {
  const [projects] = useState<Project[]>([
    {
      id: "1",
      name: "Warehouse_Building_A.std",
      type: "staad",
      buildingType: "Single Gable Hangar",
      status: "completed",
      createdAt: "2024-01-15",
      lastModified: "2024-01-15",
      loadTypes: ["Wind", "Seismic", "Dead", "Live"],
      fileSize: "2.4 MB",
    },
    {
      id: "2",
      name: "Office_Complex.s2k",
      type: "sap2000",
      buildingType: "Multi-Story Building",
      status: "in-progress",
      createdAt: "2024-01-14",
      lastModified: "2024-01-14",
      loadTypes: ["Wind", "Seismic"],
      fileSize: "5.1 MB",
    },
    {
      id: "3",
      name: "Aircraft_Hangar.std",
      type: "staad",
      buildingType: "Multi Gable Hangar",
      status: "completed",
      createdAt: "2024-01-12",
      lastModified: "2024-01-13",
      loadTypes: ["Wind", "Dead", "Live", "Crane"],
      fileSize: "3.8 MB",
    },
    {
      id: "4",
      name: "Parking_Structure.s2k",
      type: "sap2000",
      buildingType: "Car Shed/Canopy",
      status: "failed",
      createdAt: "2024-01-10",
      lastModified: "2024-01-10",
      loadTypes: ["Wind"],
      fileSize: "1.2 MB",
    },
  ]);

  const getStatusBadge = (status: Project["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Completed
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            In Progress
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            Failed
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: Project["type"]) => {
    return (
      <Badge
        variant="outline"
        className={cn(
          type === "staad" && "border-blue-200 text-blue-700",
          type === "sap2000" && "border-green-200 text-green-700",
        )}
      >
        {type === "staad" ? "STAAD.Pro" : "SAP2000"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 bg-white">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Project History</span>
          </CardTitle>
          <CardDescription>
            View and manage your previously analyzed structural models
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No projects yet
              </h3>
              <p className="text-gray-600">
                Upload your first structural model to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Building Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Load Types</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        {project.name}
                      </TableCell>
                      <TableCell>{getTypeBadge(project.type)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {project.buildingType}
                      </TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {project.loadTypes.map((loadType) => (
                            <Badge
                              key={loadType}
                              variant="secondary"
                              className="text-xs"
                            >
                              {loadType}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{project.createdAt}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {project.fileSize}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ProjectHistory;
