import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

interface QuestionData {
  type: 'coding' | 'mcq';
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  timeLimit: number;
  question?: string;
  options?: string;
  correctAnswers?: string;
  input?: string;
  expectedOutput?: string;
  isVisible: boolean;
  testCasePoints: number;
}

export default function ImportQuestions() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<QuestionData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedContest, setSelectedContest] = useState<string>('');

  // Fetch contests for selection
  const { data: contests } = useQuery({
    queryKey: ['/api/contests'],
    enabled: !!user && user.role === 'admin',
  });

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
      const requiredHeaders = ['Type', 'Title', 'Description', 'Difficulty', 'Points', 'TimeLimit'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast({
          title: "Invalid Headers",
          description: `Missing required headers: ${missingHeaders.join(', ')}`,
          variant: "destructive",
        });
        return;
      }
      
      const data: QuestionData[] = [];
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
            if (!row.Type || !row.Title || !row.Description || !row.Difficulty) {
              console.warn(`Line ${i + 1}: Missing required fields`);
              continue; // Skip rows with missing required fields
            }
            
            // Parse boolean and number values
            row.points = parseInt(row.Points) || 0;
            row.timeLimit = parseInt(row.TimeLimit) || 0;
            row.testCasePoints = parseInt(row.TestCasePoints) || 0;
            row.isVisible = row.IsVisible === 'true' || row.IsVisible === '1' || row.IsVisible === 'yes';
            
            // Map CSV headers to interface properties
            const questionData: QuestionData = {
              type: row.Type.toLowerCase() as 'coding' | 'mcq',
              title: row.Title,
              description: row.Description,
              difficulty: row.Difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
              points: row.points,
              timeLimit: row.timeLimit,
              question: row.Question || '',
              options: row.Options || '',
              correctAnswers: row.CorrectAnswers || '',
              input: row.Input || '',
              expectedOutput: row.ExpectedOutput || '',
              isVisible: row.isVisible,
              testCasePoints: row.testCasePoints,
            };
            
            // Validate type and difficulty
            if (!['coding', 'mcq'].includes(questionData.type)) {
              console.warn(`Line ${i + 1}: Invalid type '${questionData.type}', must be 'coding' or 'mcq'`);
              continue;
            }
            
            if (!['easy', 'medium', 'hard'].includes(questionData.difficulty)) {
              console.warn(`Line ${i + 1}: Invalid difficulty '${questionData.difficulty}', must be 'easy', 'medium', or 'hard'`);
              continue;
            }
            
            data.push(questionData);
          } catch (error) {
            console.error(`Error parsing line ${i + 1}:`, error);
            continue; // Skip problematic lines
          }
        }
      }
      
      if (data.length === 0) {
        toast({
          title: "No Valid Data",
          description: "No valid questions found in the CSV file.",
          variant: "destructive",
        });
        return;
      }
      
      setPreviewData(data);
      toast({
        title: "File Parsed",
        description: `Successfully parsed ${data.length} questions.`,
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
    const csvContent = `Type,Title,Description,Difficulty,Points,TimeLimit,Question,Options,CorrectAnswers,Input,ExpectedOutput,IsVisible,TestCasePoints
coding,"Two Sum","Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",easy,40,5000,,,,"[2,7,11,15]",9,true,20
coding,"Reverse String","Write a function that reverses a string.",easy,30,3000,,,,"hello","olleh",true,15
mcq,"What is 2+2?","Basic arithmetic question",medium,5,0,"What is 2+2?","4,5,6,7",0,,,true,5
mcq,"Capital of France","Geography question",medium,5,0,"What is the capital of France?","London,Paris,Berlin,Madrid",1,,,true,5`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-import-questions-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "CSV template downloaded successfully.",
    });
  };

  const importQuestions = async () => {
    if (!selectedContest) {
      toast({
        title: "Contest Required",
        description: "Please select a contest to import questions into.",
        variant: "destructive",
      });
      return;
    }

    if (previewData.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload a CSV file with questions first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Import questions one by one
      for (const question of previewData) {
        if (question.type === 'coding') {
          // Create coding problem
          const problemData = {
            title: question.title,
            description: question.description,
            difficulty: question.difficulty,
            points: question.points,
            timeLimit: question.timeLimit,
            contestId: selectedContest,
          };
          
          const problem = await fetch('/api/problems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(problemData),
          }).then(res => res.json());
          
          // Create test case if input/output provided
          if (question.input && question.expectedOutput) {
            await fetch('/api/test-cases', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                problemId: problem.id,
                input: question.input,
                expectedOutput: question.expectedOutput,
                isVisible: question.isVisible,
                points: question.testCasePoints,
              }),
            });
          }
        } else if (question.type === 'mcq') {
          // Create MCQ question
          const options = question.options?.split(',').map((opt, index) => ({
            text: opt.trim(),
            isCorrect: question.correctAnswers?.split(',').includes(index.toString()),
          })) || [];
          
          const mcqData = {
            question: question.question || question.title,
            points: question.points,
            contestId: selectedContest,
            isMultipleChoice: options.filter(opt => opt.isCorrect).length > 1,
            correctAnswers: options
              .map((opt, index) => opt.isCorrect ? index : -1)
              .filter(index => index !== -1),
          };
          
          await fetch('/api/mcq-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mcqData),
          });
        }
      }
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${previewData.length} questions.`,
      });
      
      // Reset form
      setSelectedFile(null);
      setPreviewData([]);
      setSelectedContest('');
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/contests'] });
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import questions. Please check the file format.",
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
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <FileText className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Bulk Import Questions</h1>
                <p className="text-slate-600">Import multiple questions and problems via CSV file</p>
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
              Download the CSV template to see the required format for bulk importing questions.
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

        {/* Contest Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Contest</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="contest-select">Choose Contest</Label>
              <select
                id="contest-select"
                value={selectedContest}
                onChange={(e) => setSelectedContest(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select a contest...</option>
                {contests?.map((contest) => (
                  <option key={contest.id} value={contest.id}>
                    {contest.title}
                  </option>
                ))}
              </select>
              <p className="text-sm text-slate-500">
                Questions will be imported into the selected contest.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {previewData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Preview ({previewData.length} questions)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {previewData.map((question, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={question.type === 'coding' ? 'default' : 'secondary'}>
                        {question.type ? question.type.toUpperCase() : 'UNKNOWN'}
                      </Badge>
                      <Badge variant="outline">{question.difficulty || 'unknown'}</Badge>
                    </div>
                    <h4 className="font-medium">{question.title}</h4>
                    <p className="text-sm text-slate-600">{question.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                      <span>Points: {question.points}</span>
                      {question.type === 'coding' && (
                        <span>Time: {question.timeLimit}ms</span>
                      )}
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
                  <span>Ready to import {previewData.length} questions</span>
                </div>
                <Button 
                  onClick={importQuestions} 
                  disabled={isProcessing || !selectedContest}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isProcessing ? 'Importing...' : 'Import Questions'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
