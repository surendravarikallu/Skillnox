import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  Download, 
  Users, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

interface StudentData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: 'student' | 'admin';
  studentId?: string;
}

export default function ImportStudents() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<StudentData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check authentication and admin role
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have admin privileges.</p>
        </div>
      </div>
    );
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      parseCSV(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file.",
        variant: "destructive",
      });
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      
      if (lines.length < 2) {
        toast({
          title: "Invalid File",
          description: "CSV file must have at least a header row and one data row.",
          variant: "destructive",
        });
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Validate required headers
      const requiredHeaders = ['Username', 'Email', 'FirstName', 'LastName', 'Password'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast({
          title: "Invalid Headers",
          description: `Missing required headers: ${missingHeaders.join(', ')}`,
          variant: "destructive",
        });
        return;
      }
      
      const data: StudentData[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          try {
            // Use a more robust CSV parsing approach
            const values = parseCSVLine(lines[i]);
            if (values.length !== headers.length) {
              console.warn(`Line ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
              continue; // Skip malformed lines
            }
            
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            
            // Validate required fields
            if (!row.Username || !row.Email || !row.FirstName || !row.LastName || !row.Password) {
              console.warn(`Line ${i + 1}: Missing required fields`);
              continue; // Skip rows with missing required fields
            }
            
            // Set default role to student if not specified
            if (!row.Role) {
              row.Role = 'student';
            }
            
            // Validate role
            if (!['student', 'admin'].includes(row.Role.toLowerCase())) {
              console.warn(`Line ${i + 1}: Invalid role '${row.Role}', must be 'student' or 'admin'`);
              continue;
            }
            
            const studentData: StudentData = {
              username: row.Username,
              email: row.Email,
              firstName: row.FirstName,
              lastName: row.LastName,
              password: row.Password,
              role: row.Role.toLowerCase() as 'student' | 'admin',
              studentId: row.StudentId || undefined,
            };
            
            data.push(studentData);
          } catch (error) {
            console.error(`Error parsing line ${i + 1}:`, error);
            continue; // Skip problematic lines
          }
        }
      }
      
      if (data.length === 0) {
        toast({
          title: "No Valid Data",
          description: "No valid students found in the CSV file.",
          variant: "destructive",
        });
        return;
      }
      
      setPreviewData(data);
      toast({
        title: "File Parsed",
        description: `Successfully parsed ${data.length} students.`,
      });
    };
    reader.readAsText(file);
  };

  // Helper function to parse CSV lines with proper handling of quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    
    // Remove quotes from the beginning and end of each field
    return result.map(field => {
      if (field.startsWith('"') && field.endsWith('"')) {
        return field.slice(1, -1);
      }
      return field;
    });
  };

  const downloadTemplate = () => {
    const csvContent = `Username,Email,FirstName,LastName,Password,Role,StudentId
student1,student1@example.com,John,Doe,password123,student,STU001
student2,student2@example.com,Jane,Smith,password123,student,STU002
admin2,admin2@example.com,Admin,User,password123,admin,`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-import-students-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "CSV template downloaded successfully.",
    });
  };

  const importStudents = async () => {
    if (previewData.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload a CSV file with student data first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Import students one by one
      for (const student of previewData) {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: student.username,
            email: student.email,
            firstName: student.firstName,
            lastName: student.lastName,
            password: student.password,
            role: student.role,
            studentId: student.studentId || null,
          }),
        });
      }
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${previewData.length} students.`,
      });
      
      // Reset form
      setSelectedFile(null);
      setPreviewData([]);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import students. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Users className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Bulk Import Students</h1>
                <p className="text-slate-600">Import multiple students via CSV file</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Template Download */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="w-5 h-5" />
              <span>Download Template</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              Download the CSV template to see the required format for bulk importing students.
            </p>
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>Upload CSV File</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-file">Select CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="mt-2"
                />
              </div>
              
              {selectedFile && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>{selectedFile.name} selected</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {previewData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Preview ({previewData.length} students)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {previewData.map((student, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={student.role === 'admin' ? 'default' : 'secondary'}>
                        {student.role ? student.role.toUpperCase() : 'UNKNOWN'}
                      </Badge>
                      {student.studentId && (
                        <Badge variant="outline">{student.studentId}</Badge>
                      )}
                    </div>
                    <h4 className="font-medium">{student.firstName} {student.lastName}</h4>
                    <p className="text-sm text-slate-600">{student.email}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                      <span>Username: {student.username}</span>
                      <span>Password: {student.password}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Button */}
        {previewData.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>Ready to import {previewData.length} students</span>
                </div>
                <Button 
                  onClick={importStudents} 
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isProcessing ? 'Importing...' : 'Import Students'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
