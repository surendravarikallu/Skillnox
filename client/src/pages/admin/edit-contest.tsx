import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2,
  Code,
  CheckCircle,
  AlertTriangle,
  FileText,
  Clock,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function EditContest() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Get contest ID from URL parameters
  const { id: contestId } = useParams();

  const [contestData, setContestData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    duration: 120,
    isActive: false,
  });

  const [problems, setProblems] = useState<any[]>([]);
  const [mcqQuestions, setMcqQuestions] = useState<any[]>([]);

  // Fetch existing contest data
  const { data: existingContest, isLoading: contestLoading } = useQuery<any>({
    queryKey: ['/api/contests', contestId],
    enabled: !!contestId && !!user && user.role === 'admin',
  });

  // Fetch existing problems
  const { data: existingProblems, isLoading: problemsLoading } = useQuery<any[]>({
    queryKey: ['/api/contests', contestId, 'problems'],
    enabled: !!contestId && !!user && user.role === 'admin',
  });

  // Fetch existing MCQ questions
  const { data: existingMcqQuestions, isLoading: mcqLoading } = useQuery<any[]>({
    queryKey: ['/api/contests', contestId, 'mcq-questions'],
    enabled: !!contestId && !!user && user.role === 'admin',
  });

  // Load contest data when fetched
  useEffect(() => {
    if (existingContest) {
      setContestData({
        title: existingContest.title || "",
        description: existingContest.description || "",
        startTime: existingContest.startTime ? new Date(existingContest.startTime).toISOString().slice(0, 16) : "",
        endTime: existingContest.endTime ? new Date(existingContest.endTime).toISOString().slice(0, 16) : "",
        duration: existingContest.duration || 120,
        isActive: existingContest.isActive || false,
      });
    }
  }, [existingContest]);

  // Load problems when fetched
  useEffect(() => {
    if (existingProblems) {
      setProblems(existingProblems.map((problem: any) => ({
        ...problem,
        testCases: problem.testCases || []
      })));
    }
  }, [existingProblems]);

  // Load MCQ questions when fetched
  useEffect(() => {
    if (existingMcqQuestions) {
      setMcqQuestions(existingMcqQuestions.map((mcq: any) => ({
        ...mcq,
        options: mcq.options || []
      })));
    }
  }, [existingMcqQuestions]);

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

  // Update contest mutation
  const updateContestMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PUT', `/api/contests/${contestId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contest updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contests'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update contest. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create problem mutation
  const createProblemMutation = useMutation({
    mutationFn: async (problemData: any) => {
      return await apiRequest('POST', '/api/problems', problemData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contests', contestId, 'problems'] });
      toast({
        title: "Success",
        description: "Problem created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create problem. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update problem mutation
  const updateProblemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      return await apiRequest('PUT', `/api/problems/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contests', contestId, 'problems'] });
      toast({
        title: "Success",
        description: "Problem updated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update problem. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete problem mutation
  const deleteProblemMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/problems/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contests', contestId, 'problems'] });
      toast({
        title: "Success",
        description: "Problem deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete problem. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create MCQ question mutation
  const createMcqMutation = useMutation({
    mutationFn: async (mcqData: any) => {
      return await apiRequest('POST', '/api/mcq-questions', mcqData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contests', contestId, 'mcq-questions'] });
      toast({
        title: "Success",
        description: "MCQ question created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create MCQ question. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update MCQ question mutation
  const updateMcqMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      return await apiRequest('PUT', `/api/mcq-questions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contests', contestId, 'mcq-questions'] });
      toast({
        title: "Success",
        description: "MCQ question updated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update MCQ question. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete MCQ question mutation
  const deleteMcqMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/mcq-questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contests', contestId, 'mcq-questions'] });
      toast({
        title: "Success",
        description: "MCQ question deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete MCQ question. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create test case mutation
  const createTestCaseMutation = useMutation({
    mutationFn: async (testCaseData: any) => {
      return await apiRequest('POST', '/api/test-cases', testCaseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contests', contestId, 'problems'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create test case. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update test case mutation
  const updateTestCaseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      return await apiRequest('PUT', `/api/test-cases/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contests', contestId, 'problems'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update test case. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete test case mutation
  const deleteTestCaseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/test-cases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contests', contestId, 'problems'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete test case. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contestId) return;

    setIsSubmitting(true);
    try {
      await updateContestMutation.mutateAsync(contestData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addProblem = () => {
    const newProblem = {
      id: `new_${Date.now()}`,
      title: "",
      description: "",
      difficulty: "medium",
      points: 40,
      timeLimit: 5000,
      memoryLimit: 256,
      contestId: contestId,
      orderIndex: problems.length + 1,
      testCases: [
        { input: "", expectedOutput: "", isVisible: true, points: 20 },
      ],
    };
    setProblems([...problems, newProblem]);
  };

  const removeProblem = async (index: number) => {
    const problem = problems[index];
    if (problem.id && !problem.id.toString().startsWith('new_')) {
      // Delete from server if it exists
      await deleteProblemMutation.mutateAsync(problem.id);
    } else {
      // Remove from local state if it's new
      setProblems(problems.filter((_, i) => i !== index));
    }
  };

  const saveProblem = async (index: number) => {
    try {
      const problem = problems[index];
      const problemData = {
        ...problem,
        contestId: contestId,
        orderIndex: problem.orderIndex || index + 1,
      };

      let createdProblem;
      if (problem.id && !problem.id.toString().startsWith('new_')) {
        // Update existing problem
        createdProblem = await updateProblemMutation.mutateAsync({ id: problem.id, data: problemData });
      } else {
        // Create new problem
        createdProblem = await createProblemMutation.mutateAsync(problemData);
        
        // Update local state with the new problem ID
        const updatedProblems = [...problems];
        updatedProblems[index] = { ...updatedProblems[index], id: createdProblem.id };
        setProblems(updatedProblems);
      }

      // Handle test cases
      if (createdProblem && problem.testCases && problem.testCases.length > 0) {
        for (let i = 0; i < problem.testCases.length; i++) {
          const testCase = problem.testCases[i];
          const testCaseData = {
            ...testCase,
            problemId: createdProblem.id,
            orderIndex: i + 1,
          };

          if (testCase.id && !testCase.id.toString().startsWith('new_')) {
            // Update existing test case
            await updateTestCaseMutation.mutateAsync({ id: testCase.id, data: testCaseData });
          } else {
            // Create new test case
            const newTestCase = await createTestCaseMutation.mutateAsync(testCaseData);
            
            // Update local state with the new test case ID
            const updatedProblems = [...problems];
            updatedProblems[index].testCases[i] = { ...updatedProblems[index].testCases[i], id: newTestCase.id };
            setProblems(updatedProblems);
          }
        }
      }

      // Refresh problems data to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['/api/contests', contestId, 'problems'] });
      
      toast({
        title: "Success",
        description: "Problem saved successfully!",
      });
    } catch (error) {
      console.error("Error saving problem:", error);
      toast({
        title: "Error",
        description: "Failed to save problem. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateProblem = (index: number, field: string, value: any) => {
    const updatedProblems = [...problems];
    updatedProblems[index] = { ...updatedProblems[index], [field]: value };
    setProblems(updatedProblems);
  };

  const addTestCase = (problemIndex: number) => {
    const updatedProblems = [...problems];
    updatedProblems[problemIndex].testCases.push({
      input: "",
      expectedOutput: "",
      isVisible: true,
      points: 20,
    });
    setProblems(updatedProblems);
  };

  const removeTestCase = async (problemIndex: number, testCaseIndex: number) => {
    const problem = problems[problemIndex];
    const testCase = problem.testCases[testCaseIndex];
    
    if (testCase.id && !testCase.id.toString().startsWith('new_')) {
      // Delete from server if it exists
      await deleteTestCaseMutation.mutateAsync(testCase.id);
    }
    
    // Remove from local state
    const updatedProblems = [...problems];
    updatedProblems[problemIndex].testCases.splice(testCaseIndex, 1);
    setProblems(updatedProblems);
  };

  const updateTestCase = (problemIndex: number, testCaseIndex: number, field: string, value: any) => {
    const updatedProblems = [...problems];
    updatedProblems[problemIndex].testCases[testCaseIndex] = {
      ...updatedProblems[problemIndex].testCases[testCaseIndex],
      [field]: value,
    };
    setProblems(updatedProblems);
  };

  const saveTestCase = async (problemIndex: number, testCaseIndex: number) => {
    try {
      const problem = problems[problemIndex];
      const testCase = problem.testCases[testCaseIndex];
      
      if (!problem.id || problem.id.toString().startsWith('new_')) {
        toast({
          title: "Error",
          description: "Please save the problem first before saving test cases.",
          variant: "destructive",
        });
        return;
      }

      const testCaseData = {
        ...testCase,
        problemId: problem.id,
        orderIndex: testCaseIndex + 1,
      };

      if (testCase.id && !testCase.id.toString().startsWith('new_')) {
        // Update existing test case
        await updateTestCaseMutation.mutateAsync({ id: testCase.id, data: testCaseData });
        toast({
          title: "Success",
          description: "Test case updated successfully!",
        });
      } else {
        // Create new test case
        const newTestCase = await createTestCaseMutation.mutateAsync(testCaseData);
        
        // Update local state with the new test case ID
        const updatedProblems = [...problems];
        updatedProblems[problemIndex].testCases[testCaseIndex] = { 
          ...updatedProblems[problemIndex].testCases[testCaseIndex], 
          id: newTestCase.id 
        };
        setProblems(updatedProblems);
        
        toast({
          title: "Success",
          description: "Test case created successfully!",
        });
      }

      // Refresh problems data to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['/api/contests', contestId, 'problems'] });
    } catch (error) {
      console.error("Error saving test case:", error);
      toast({
        title: "Error",
        description: "Failed to save test case. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addMcqQuestion = () => {
    const newMcq = {
      id: `new_${Date.now()}`,
      question: "",
      options: [{ text: "", isCorrect: false }],
      isMultipleChoice: false,
      points: 5,
      contestId: contestId,
      orderIndex: mcqQuestions.length + 1,
    };
    setMcqQuestions([...mcqQuestions, newMcq]);
  };

  const removeMcqQuestion = async (index: number) => {
    const mcq = mcqQuestions[index];
    if (mcq.id && !mcq.id.toString().startsWith('new_')) {
      // Delete from server if it exists
      await deleteMcqMutation.mutateAsync(mcq.id);
    } else {
      // Remove from local state if it's new
      setMcqQuestions(mcqQuestions.filter((_, i) => i !== index));
    }
  };

  const saveMcqQuestion = async (index: number) => {
    const mcq = mcqQuestions[index];
    const mcqData = {
      ...mcq,
      contestId: contestId,
      orderIndex: mcq.orderIndex || index + 1,
    };

    if (mcq.id && !mcq.id.toString().startsWith('new_')) {
      // Update existing MCQ question
      await updateMcqMutation.mutateAsync({ id: mcq.id, data: mcqData });
    } else {
      // Create new MCQ question
      await createMcqMutation.mutateAsync(mcqData);
    }
  };

  const updateMcqQuestion = (index: number, field: string, value: any) => {
    const updatedMcqQuestions = [...mcqQuestions];
    updatedMcqQuestions[index] = { ...updatedMcqQuestions[index], [field]: value };
    setMcqQuestions(updatedMcqQuestions);
  };

  const addMcqOption = (questionIndex: number) => {
    const updatedMcqQuestions = [...mcqQuestions];
    updatedMcqQuestions[questionIndex].options.push({ text: "", isCorrect: false });
    setMcqQuestions(updatedMcqQuestions);
  };

  const removeMcqOption = (questionIndex: number, optionIndex: number) => {
    const updatedMcqQuestions = [...mcqQuestions];
    updatedMcqQuestions[questionIndex].options.splice(optionIndex, 1);
    setMcqQuestions(updatedMcqQuestions);
  };

  const updateMcqOption = (questionIndex: number, optionIndex: number, field: string, value: any) => {
    const updatedMcqQuestions = [...mcqQuestions];
    updatedMcqQuestions[questionIndex].options[optionIndex] = {
      ...updatedMcqQuestions[questionIndex].options[optionIndex],
      [field]: value,
    };
    setMcqQuestions(updatedMcqQuestions);
  };

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

  if (contestLoading || problemsLoading || mcqLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin/contests">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Contests
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Code className="text-white text-lg" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Edit Contest</h1>
                  <p className="text-slate-600">Update contest details and configuration</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Contest Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="w-5 h-5" />
                <span>Contest Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Contest Title</Label>
                  <Input
                    id="title"
                    value={contestData.title}
                    onChange={(e) => setContestData({ ...contestData, title: e.target.value })}
                    placeholder="Enter contest title"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={contestData.duration}
                    onChange={(e) => setContestData({ ...contestData, duration: parseInt(e.target.value) })}
                    placeholder="120"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={contestData.description}
                  onChange={(e) => setContestData({ ...contestData, description: e.target.value })}
                  placeholder="Enter contest description"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={contestData.startTime}
                    onChange={(e) => setContestData({ ...contestData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={contestData.endTime}
                    onChange={(e) => setContestData({ ...contestData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={contestData.isActive}
                  onCheckedChange={(checked) => setContestData({ ...contestData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active Contest</Label>
              </div>
            </CardContent>
          </Card>

          {/* Programming Problems */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Code className="w-5 h-5" />
                  <span>Programming Problems</span>
                </CardTitle>
                <Button type="button" onClick={addProblem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Problem
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {problems.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Code className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No programming problems added yet.</p>
                  <p className="text-sm">Click "Add Problem" to create the first problem.</p>
                </div>
              ) : (
                problems.map((problem, problemIndex) => (
                  <div key={problem.id} className="border border-slate-200 rounded-lg p-6 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Problem {problemIndex + 1}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          onClick={() => saveProblem(problemIndex)}
                          size="sm"
                          variant="outline"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                        <Button
                          type="button"
                          onClick={() => removeProblem(problemIndex)}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>Title</Label>
                        <Input
                          value={problem.title}
                          onChange={(e) => updateProblem(problemIndex, 'title', e.target.value)}
                          placeholder="Problem title"
                        />
                      </div>
                      <div>
                        <Label>Difficulty</Label>
                        <Select
                          value={problem.difficulty}
                          onValueChange={(value) => updateProblem(problemIndex, 'difficulty', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Points</Label>
                        <Input
                          type="number"
                          value={problem.points}
                          onChange={(e) => updateProblem(problemIndex, 'points', parseInt(e.target.value))}
                          placeholder="40"
                          min="1"
                        />
                      </div>
                      <div>
                        <Label>Time Limit (ms)</Label>
                        <Input
                          type="number"
                          value={problem.timeLimit}
                          onChange={(e) => updateProblem(problemIndex, 'timeLimit', parseInt(e.target.value))}
                          placeholder="5000"
                          min="1000"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <Label>Description</Label>
                      <Textarea
                        value={problem.description}
                        onChange={(e) => updateProblem(problemIndex, 'description', e.target.value)}
                        placeholder="Problem description"
                        rows={4}
                      />
                    </div>

                    {/* Test Cases */}
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-base font-medium">Test Cases</Label>
                        <Button
                          type="button"
                          onClick={() => addTestCase(problemIndex)}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Test Case
                        </Button>
                      </div>
                      
                      {problem.testCases.map((testCase: any, testCaseIndex: number) => (
                        <div key={testCaseIndex} className="border border-slate-200 rounded p-4 mb-3 bg-slate-50">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-slate-700">
                              Test Case {testCaseIndex + 1}
                            </span>
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                onClick={() => saveTestCase(problemIndex, testCaseIndex)}
                                size="sm"
                                variant="outline"
                              >
                                <Save className="w-4 h-4 mr-2" />
                                Save
                              </Button>
                              <Button
                                type="button"
                                onClick={() => removeTestCase(problemIndex, testCaseIndex)}
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Input</Label>
                              <Textarea
                                value={testCase.input}
                                onChange={(e) => updateTestCase(problemIndex, testCaseIndex, 'input', e.target.value)}
                                placeholder="Test input"
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label>Expected Output</Label>
                              <Textarea
                                value={testCase.expectedOutput}
                                onChange={(e) => updateTestCase(problemIndex, testCaseIndex, 'expectedOutput', e.target.value)}
                                placeholder="Expected output"
                                rows={2}
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            <div>
                              <Label>Points</Label>
                              <Input
                                type="number"
                                value={testCase.points}
                                onChange={(e) => updateTestCase(problemIndex, testCaseIndex, 'points', parseInt(e.target.value))}
                                placeholder="20"
                                min="1"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={testCase.isVisible}
                                onCheckedChange={(checked) => updateTestCase(problemIndex, testCaseIndex, 'isVisible', checked)}
                              />
                              <Label>Visible to students</Label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* MCQ Questions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>MCQ Questions</span>
                </CardTitle>
                <Button type="button" onClick={addMcqQuestion} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add MCQ
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {mcqQuestions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No MCQ questions added yet.</p>
                  <p className="text-sm">Click "Add MCQ" to create the first question.</p>
                </div>
              ) : (
                mcqQuestions.map((mcq, mcqIndex) => (
                  <div key={mcq.id} className="border border-slate-200 rounded-lg p-6 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">
                        MCQ Question {mcqIndex + 1}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          onClick={() => saveMcqQuestion(mcqIndex)}
                          size="sm"
                          variant="outline"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                        <Button
                          type="button"
                          onClick={() => removeMcqQuestion(mcqIndex)}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>Points</Label>
                        <Input
                          type="number"
                          value={mcq.points}
                          onChange={(e) => updateMcqQuestion(mcqIndex, 'points', parseInt(e.target.value))}
                          placeholder="5"
                          min="1"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={mcq.isMultipleChoice}
                          onCheckedChange={(checked) => updateMcqQuestion(mcqIndex, 'isMultipleChoice', checked)}
                        />
                        <Label>Multiple Choice</Label>
                      </div>
                    </div>

                    <div className="mb-4">
                      <Label>Question</Label>
                      <Textarea
                        value={mcq.question}
                        onChange={(e) => updateMcqQuestion(mcqIndex, 'question', e.target.value)}
                        placeholder="Enter the question"
                        rows={3}
                      />
                    </div>

                    {/* Options */}
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-base font-medium">Options</Label>
                        <Button
                          type="button"
                          onClick={() => addMcqOption(mcqIndex)}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                      
                      {mcq.options.map((option: any, optionIndex: number) => (
                        <div key={optionIndex} className="flex items-center space-x-3 mb-3">
                          <input
                            type={mcq.isMultipleChoice ? "checkbox" : "radio"}
                            name={`mcq-${mcqIndex}`}
                            checked={option.isCorrect}
                            onChange={(e) => updateMcqOption(mcqIndex, optionIndex, 'isCorrect', e.target.checked)}
                            className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                          />
                          <Input
                            value={option.text}
                            onChange={(e) => updateMcqOption(mcqIndex, optionIndex, 'text', e.target.value)}
                            placeholder={`Option ${optionIndex + 1}`}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={() => removeMcqOption(mcqIndex, optionIndex)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            disabled={mcq.options.length <= 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link href="/admin/contests">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Update Contest
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
