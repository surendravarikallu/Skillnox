import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Download,
  Upload
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function CreateContest() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [contestData, setContestData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    duration: 120,
    isActive: false,
  });

  const [problems, setProblems] = useState([
    {
      id: Date.now(),
      title: "",
      description: "",
      difficulty: "medium",
      points: 40,
      timeLimit: 5000,
      memoryLimit: 256,
      testCases: [
        { input: "", expectedOutput: "", isVisible: true, points: 20 },
        { input: "", expectedOutput: "", isVisible: true, points: 20 },
      ],
    },
  ]);

  const [mcqQuestions, setMcqQuestions] = useState([
    {
      id: Date.now(),
      question: "",
      options: [{ text: "", isCorrect: false }],
      isMultipleChoice: false,
      points: 5,
    },
  ]);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [user, toast]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return null;
  }

  const addProblem = () => {
    setProblems([
      ...problems,
      {
        id: Date.now(),
        title: "",
        description: "",
        difficulty: "medium",
        points: 40,
        timeLimit: 5000,
        memoryLimit: 256,
        testCases: [
          { input: "", expectedOutput: "", isVisible: true, points: 20 },
          { input: "", expectedOutput: "", isVisible: true, points: 20 },
        ],
      },
    ]);
  };

  const removeProblem = (id: number) => {
    setProblems(problems.filter(p => p.id !== id));
  };

  const updateProblem = (id: number, field: string, value: any) => {
    setProblems(problems.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const addTestCase = (problemId: number) => {
    setProblems(problems.map(p => 
      p.id === problemId 
        ? { 
            ...p, 
            testCases: [...p.testCases, { input: "", expectedOutput: "", isVisible: false, points: 0 }] 
          }
        : p
    ));
  };

  const updateTestCase = (problemId: number, testCaseIndex: number, field: string, value: any) => {
    setProblems(problems.map(p => 
      p.id === problemId 
        ? {
            ...p,
            testCases: p.testCases.map((tc, i) => 
              i === testCaseIndex ? { ...tc, [field]: value } : tc
            )
          }
        : p
    ));
  };

  const removeTestCase = (problemId: number, testCaseIndex: number) => {
    setProblems(problems.map(p =>
      p.id === problemId
        ? {
            ...p,
            testCases: p.testCases.filter((_, index) => index !== testCaseIndex)
          }
        : p
    ));
  };

  const addMcqQuestion = () => {
    setMcqQuestions([
      ...mcqQuestions,
      {
        id: Date.now(),
        question: "",
        options: [{ text: "", isCorrect: false }],
        isMultipleChoice: false,
        points: 5,
      },
    ]);
  };

  const removeMcqQuestion = (id: number) => {
    setMcqQuestions(mcqQuestions.filter(q => q.id !== id));
  };

  const updateMcqQuestion = (id: number, field: string, value: any) => {
    setMcqQuestions(mcqQuestions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const addOption = (questionId: number) => {
    setMcqQuestions(mcqQuestions.map(q => 
      q.id === questionId 
        ? { ...q, options: [...q.options, { text: "", isCorrect: false }] }
        : q
    ));
  };

  const updateOption = (questionId: number, optionIndex: number, field: string, value: any) => {
    setMcqQuestions(mcqQuestions.map(q => 
      q.id === questionId 
        ? {
            ...q,
            options: q.options.map((opt, i) => 
              i === optionIndex ? { ...opt, [field]: value } : opt
            )
          }
        : q
    ));
  };

    const removeOption = (questionId: number, optionIndex: number) => {
    setMcqQuestions(mcqQuestions.map(q => 
      q.id === questionId 
        ? {
            ...q,
            options: q.options.filter((_, index) => index !== optionIndex)
          }
        : q
    ));
  };

  const handleBulkImportProblems = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.split('\n');
        
        const newProblems = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            // Parse CSV line properly handling quoted fields
            const values = parseCSVLine(lines[i]);
            
            if (values.length >= 9) {
              const problem = {
                id: Date.now() + i,
                title: values[0]?.trim() || '',
                description: values[1]?.trim() || '',
                difficulty: values[2]?.trim() || 'medium',
                points: parseInt(values[3]?.trim()) || 40,
                timeLimit: parseInt(values[4]?.trim()) || 5000,
                memoryLimit: 256,
                orderIndex: problems.length + newProblems.length + 1,
                testCases: [
                  {
                    input: values[5]?.trim() || '',
                    expectedOutput: values[6]?.trim() || '',
                    isVisible: values[7]?.trim().toLowerCase() === 'true' || values[7]?.trim() === '1' || values[7]?.trim() === 'yes',
                    points: parseInt(values[8]?.trim()) || 20
                  }
                ]
              };
              
              if (problem.title && problem.description) {
                newProblems.push(problem);
              }
            }
          }
        }
        
        if (newProblems.length > 0) {
          setProblems([...problems, ...newProblems]);
          toast({
            title: "Import Successful",
            description: `Imported ${newProblems.length} problems successfully!`,
          });
        } else {
          toast({
            title: "Import Failed",
            description: "No valid problems found in the CSV file.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast({
          title: "Import Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleBulkImportMcqs = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.split('\n');
        
        const newMcqs = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            // Parse CSV line properly handling quoted fields
            const values = parseCSVLine(lines[i]);
            
                        if (values.length >= 5) {
              const question = values[0]?.trim() || '';
              const points = parseInt(values[1]?.trim()) || 5;
              const isMultipleChoice = values[2]?.trim().toLowerCase() === 'true' || values[2]?.trim() === '1' || values[2]?.trim() === 'yes';
              const optionsText = values[3]?.trim() || '';
              const correctAnswersText = values[4]?.trim() || '';
              
              console.log(`Parsing MCQ line ${i}:`, {
                question,
                points,
                isMultipleChoice,
                optionsText,
                correctAnswersText,
                rawValues: values
              });
              
              // Parse options with special handling for array-like content
              const options = optionsText ? parseArrayOptions(optionsText) : [];
              
              // Parse correct answers (split by comma and convert to numbers)
              const correctAnswers = correctAnswersText ? 
                correctAnswersText.split(',').map(ans => parseInt(ans.trim())).filter(num => !isNaN(num)) : [];
              
              console.log(`Parsed options:`, options);
              console.log(`Parsed correct answers:`, correctAnswers);
              
              // Set correct answers
              options.forEach((option, index) => {
                option.isCorrect = correctAnswers.includes(index);
              });
              
              const mcq = {
                id: Date.now() + i,
                question: question,
                points: points,
                isMultipleChoice: isMultipleChoice,
                orderIndex: mcqQuestions.length + newMcqs.length + 1,
                options: options.length > 0 ? options : [{ text: '', isCorrect: false }]
              };
              
              console.log(`Created MCQ object:`, mcq);
              
              if (question && options.length > 0) {
                newMcqs.push(mcq);
              }
            }
          }
        }
        
        if (newMcqs.length > 0) {
          setMcqQuestions([...mcqQuestions, ...newMcqs]);
          toast({
            title: "Import Successful",
            description: `Imported ${newMcqs.length} MCQ questions successfully!`,
          });
        } else {
          toast({
            title: "Import Failed",
            description: "No valid MCQ questions found in the CSV file.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast({
          title: "Import Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  // Helper function to parse options that may contain arrays with commas
  const parseArrayOptions = (optionsText: string) => {
    console.log('Parsing options text:', optionsText);
    
    const options = [];
    let current = '';
    let bracketCount = 0;
    let inQuotes = false;
    
    for (let i = 0; i < optionsText.length; i++) {
      const char = optionsText[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === '[' || char === '(' || char === '{') {
        bracketCount++;
        current += char;
      } else if (char === ']' || char === ')' || char === '}') {
        bracketCount--;
        current += char;
      } else if (char === ',' && bracketCount === 0 && !inQuotes) {
        // Only split on comma if we're not inside brackets and not in quotes
        console.log(`Splitting at position ${i}, bracketCount: ${bracketCount}, inQuotes: ${inQuotes}`);
        console.log(`Adding option: "${current.trim()}"`);
        options.push({ text: current.trim(), isCorrect: false });
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last option
    if (current.trim()) {
      console.log(`Adding final option: "${current.trim()}"`);
      options.push({ text: current.trim(), isCorrect: false });
    }
    
    console.log('Final parsed options:', options);
    return options;
  };

  // Helper function to parse CSV line properly
  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    let escapeNext = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (escapeNext) {
        current += char;
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
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
    
    // Remove quotes from fields and handle escaped characters
    return result.map(field => {
      // Remove outer quotes if they exist
      let cleaned = field.replace(/^"|"$/g, '');
      // Handle common escaped characters
      cleaned = cleaned.replace(/\\n/g, '\n');
      cleaned = cleaned.replace(/\\t/g, '\t');
      cleaned = cleaned.replace(/\\"/g, '"');
      cleaned = cleaned.replace(/\\\\/g, '\\');
      return cleaned;
    });
  };

  const handleBulkImportStudents = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            const studentData = {
              username: values[0] || '',
              email: values[1] || '',
              password: values[2] || 'defaultPassword123',
              role: 'student'
            };
            
            try {
              await apiRequest('POST', '/api/auth/register', studentData);
              successCount++;
            } catch (error) {
              console.error(`Failed to import student ${studentData.username}:`, error);
              errorCount++;
            }
          }
        }
        
        if (successCount > 0) {
          toast({
            title: "Import Completed",
            description: `Successfully imported ${successCount} students. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
          });
        } else {
          toast({
            title: "Import Failed",
            description: "No students were imported successfully.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast({
          title: "Import Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate basic contest data
    if (!contestData.title || !contestData.startTime || !contestData.endTime) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required contest fields.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Create the contest first
      const contestResponse = await apiRequest('POST', '/api/contests', contestData);
      const contest = await contestResponse.json();
      
      // Create problems
      for (const problem of problems) {
        if (problem.title && problem.description) {
          const problemData = {
            ...problem,
            contestId: contest.id,
            orderIndex: problems.indexOf(problem) + 1,
            testCases: undefined // Remove testCases from problem data
          };
          
          const problemResponse = await apiRequest('POST', '/api/problems', problemData);
          const createdProblem = await problemResponse.json();
          
          // Create test cases for this problem
          for (const testCase of problem.testCases) {
            if (testCase.input && testCase.expectedOutput) {
              await apiRequest('POST', '/api/test-cases', {
                ...testCase,
                problemId: createdProblem.id,
                orderIndex: problem.testCases.indexOf(testCase) + 1
              });
            }
          }
        }
      }
      
      // Create MCQ questions
      for (const mcq of mcqQuestions) {
        if (mcq.question && mcq.options.length > 0) {
          const mcqData = {
            ...mcq,
            contestId: contest.id,
            orderIndex: mcqQuestions.indexOf(mcq) + 1,
            correctAnswers: mcq.options
              .map((option, index) => option.isCorrect ? index : -1)
              .filter(index => index !== -1)
          };
          
          await apiRequest('POST', '/api/mcq-questions', mcqData);
        }
      }
      
      toast({
        title: "Success",
        description: "Contest created successfully with all problems and questions!",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/contests'] });
      setLocation('/admin/contests');
      
    } catch (error) {
      console.error('Error creating contest:', error);
      toast({
        title: "Error",
        description: "Failed to create contest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <Link href="/admin/contests">
              <Button variant="ghost" size="sm" data-testid="button-back-to-contests">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Contests
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Create New Contest</h1>
              <p className="text-slate-600">Set up a comprehensive coding and MCQ contest</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Create and download CSV template for students
                  const csvContent = `Username,Email,Password
john_doe,john@example.com,password123
jane_smith,jane@example.com,password123
bob_wilson,bob@example.com,password123`;
                  
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'students-template.csv';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                  
                  toast({
                    title: "Template Downloaded",
                    description: "CSV template for students downloaded. Fill it with student data and use the Import Students button.",
                  });
                }}
                className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                <Download className="w-4 h-4" />
                Download Students Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      handleBulkImportStudents(file);
                    }
                  };
                  input.click();
                }}
                className="flex items-center space-x-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
              >
                <Upload className="w-4 h-4" />
                Import Students
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Contest Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Contest Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Contest Title *</Label>
                  <Input
                    id="title"
                    value={contestData.title}
                    onChange={(e) => setContestData({ ...contestData, title: e.target.value })}
                    placeholder="e.g., Data Structures Challenge"
                    required
                    data-testid="input-contest-title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={contestData.duration}
                    onChange={(e) => setContestData({ ...contestData, duration: parseInt(e.target.value) })}
                    data-testid="input-contest-duration"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={contestData.startTime}
                    onChange={(e) => setContestData({ ...contestData, startTime: e.target.value })}
                    required
                    data-testid="input-contest-start"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={contestData.endTime}
                    onChange={(e) => setContestData({ ...contestData, endTime: e.target.value })}
                    required
                    data-testid="input-contest-end"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={contestData.description}
                  onChange={(e) => setContestData({ ...contestData, description: e.target.value })}
                  placeholder="Contest description and instructions..."
                  rows={3}
                  data-testid="textarea-contest-description"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={contestData.isActive}
                  onCheckedChange={(checked) => setContestData({ ...contestData, isActive: checked })}
                  data-testid="switch-contest-active"
                />
                <Label htmlFor="isActive">Make contest active immediately</Label>
              </div>
            </CardContent>
          </Card>

          {/* Coding Problems */}
          <Card>
            <CardHeader>
                          <div className="flex items-center justify-between">
              <CardTitle>Coding Problems</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Create and download CSV template for problems
                    const csvContent = `Title,Description,Difficulty,Points,TimeLimit,Input,ExpectedOutput,IsVisible,TestCasePoints
Two Sum,"Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",easy,40,5000,"[2,7,11,15]",9,true,20
Reverse String,"Write a function that reverses a string.",easy,30,3000,hello,olleh,true,15
Palindrome Check,"Check if a string is a palindrome.",medium,50,4000,racecar,true,true,25
Array Sort,"Sort an array in ascending order.",medium,35,4000,"[3,1,4,1,5]",true,true,20
Parentheses Test,"Test with (parentheses) and [brackets] in description.",medium,25,3000,"(a+b)",true,1,15
Boolean Test,"Test with different boolean values.",easy,20,2000,test,result,1,10`;
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'problems-template.csv';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    
                    toast({
                      title: "Template Downloaded",
                      description: "CSV template for problems downloaded. You can use this to bulk import problems.",
                    });
                  }}
                  className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.csv';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        handleBulkImportProblems(file);
                      }
                    };
                    input.click();
                  }}
                  className="flex items-center space-x-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  <Upload className="w-4 h-4" />
                  Import Problems
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addProblem}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Problem
                </Button>
              </div>
            </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {problems.map((problem, index) => (
                <div key={problem.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Problem {index + 1}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeProblem(problem.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={problem.title}
                        onChange={(e) => updateProblem(problem.id, 'title', e.target.value)}
                        placeholder="Problem title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <select
                        value={problem.difficulty}
                        onChange={(e) => updateProblem(problem.id, 'difficulty', e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Points</Label>
                      <Input
                        type="number"
                        value={problem.points}
                        onChange={(e) => updateProblem(problem.id, 'points', parseInt(e.target.value))}
                        placeholder="40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time Limit (ms)</Label>
                      <Input
                        type="number"
                        value={problem.timeLimit}
                        onChange={(e) => updateProblem(problem.id, 'timeLimit', parseInt(e.target.value))}
                        placeholder="5000"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={problem.description}
                      onChange={(e) => updateProblem(problem.id, 'description', e.target.value)}
                      placeholder="Problem description..."
                      rows={4}
                    />
                  </div>
                  
                  {/* Test Cases */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Test Cases</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTestCase(problem.id)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Test Case
                      </Button>
                    </div>
                    
                    {problem.testCases.map((testCase, testCaseIndex) => (
                      <div key={testCaseIndex} className="border rounded p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Test Case {testCaseIndex + 1}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeTestCase(problem.id, testCaseIndex)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Input</Label>
                            <Textarea
                              value={testCase.input}
                              onChange={(e) => updateTestCase(problem.id, testCaseIndex, 'input', e.target.value)}
                              placeholder="Test input"
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Expected Output</Label>
                            <Textarea
                              value={testCase.expectedOutput}
                              onChange={(e) => updateTestCase(problem.id, testCaseIndex, 'expectedOutput', e.target.value)}
                              placeholder="Expected output"
                              rows={2}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={testCase.isVisible}
                              onChange={(e) => updateTestCase(problem.id, testCaseIndex, 'isVisible', e.target.checked)}
                            />
                            <Label>Visible to students</Label>
                          </div>
                          <div className="space-y-2">
                            <Label>Points</Label>
                            <Input
                              type="number"
                              value={testCase.points}
                              onChange={(e) => updateTestCase(problem.id, testCaseIndex, 'points', parseInt(e.target.value))}
                              className="w-20"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* MCQ Questions */}
          <Card>
            <CardHeader>
                          <div className="flex items-center justify-between">
              <CardTitle>MCQ Questions</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Create and download CSV template for MCQ questions
                    const csvContent = `Question,Points,IsMultipleChoice,Options,CorrectAnswers
What is 2+2?,5,false,"4,5,6,7",0
Capital of France,5,false,"London,Paris,Berlin,Madrid",1
Programming languages,10,true,"Python,Java,JavaScript,C++","0,1,2"
Data structures,8,true,"Array,LinkedList,Stack,Queue","0,1,2,3"
Math operations,5,false,"Add,Subtract,Multiply,Divide",2
Colors,3,true,"Red,Green,Blue,Yellow","0,1,2"
Parentheses example,5,false,"(a+b),(a-b),(a*b),(a/b)",1
Boolean test,5,1,"Yes,No,Maybe","0,2"
Another test,5,yes,"Option A,Option B,Option C","1,2"
Array options,5,false,"[1,2,3,1,2,3],[2,4,6],Error,[1,2,3,2,4,6]",1
Matrix test,5,true,"[1,2],[3,4],[5,6],[7,8]","0,1,2"`;
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'mcq-template.csv';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    
                    toast({
                      title: "Template Downloaded",
                      description: "CSV template for MCQ questions downloaded. You can use this to bulk import MCQs.",
                    });
                  }}
                  className="flex items-center space-x-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.csv';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        handleBulkImportMcqs(file);
                      }
                    };
                    input.click();
                  }}
                  className="flex items-center space-x-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  <Upload className="w-4 h-4" />
                  Import MCQs
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMcqQuestion}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  Add MCQ
                </Button>
              </div>
            </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {mcqQuestions.map((mcq, index) => (
                <div key={mcq.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">MCQ Question {index + 1}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMcqQuestion(mcq.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Question</Label>
                      <Textarea
                        value={mcq.question}
                        onChange={(e) => updateMcqQuestion(mcq.id, 'question', e.target.value)}
                        placeholder="Enter your question..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Points</Label>
                        <Input
                          type="number"
                          value={mcq.points}
                          onChange={(e) => updateMcqQuestion(mcq.id, 'points', parseInt(e.target.value))}
                          placeholder="5"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={mcq.isMultipleChoice}
                          onChange={(e) => updateMcqQuestion(mcq.id, 'isMultipleChoice', e.target.checked)}
                        />
                        <Label>Multiple choice (select multiple answers)</Label>
                      </div>
                    </div>
                    
                    {/* Options */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Options</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(mcq.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                      
                      {mcq.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-3">
                          <input
                            type={mcq.isMultipleChoice ? "checkbox" : "radio"}
                            name={`mcq-${mcq.id}`}
                            checked={option.isCorrect}
                            onChange={(e) => updateOption(mcq.id, optionIndex, 'isCorrect', e.target.checked)}
                          />
                          <Input
                            value={option.text}
                            onChange={(e) => updateOption(mcq.id, optionIndex, 'text', e.target.value)}
                            placeholder={`Option ${optionIndex + 1}`}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeOption(mcq.id, optionIndex)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <Link href="/admin/contests">
              <Button variant="outline" data-testid="button-cancel">
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700"
              data-testid="button-create-contest"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Contest
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}