import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Code, 
  Play, 
  Send, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Trophy,
  History,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "wouter";
import MonacoEditor, { MonacoEditorRef } from "@/components/monaco-editor";
import ContestTimer from "@/components/contest-timer";
import AntiCheat from "@/components/anti-cheat";
import Leaderboard from "@/components/leaderboard";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  points: number;
  timeLimit: number;
  memoryLimit: number;
  orderIndex: number;
}

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isVisible: boolean;
  points: number;
  orderIndex: number;
}

interface McqQuestion {
  id: string;
  question: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  isMultipleChoice: boolean;
  points: number;
  orderIndex: number;
}

interface Submission {
  id: string;
  status: string;
  score: number;
  executionTime?: number;
  memoryUsage?: number;
  submittedAt: string;
}

export default function ContestTaking() {
  const { contestId } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const editorRef = useRef<MonacoEditorRef>(null);

  const [activeTab, setActiveTab] = useState("problems");
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
  const [code, setCode] = useState("// Write your solution here\n");
  const [language, setLanguage] = useState("javascript");
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string[]>>({});
  const [testResults, setTestResults] = useState<any[]>([]);
  const [submissionResults, setSubmissionResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [testCaseStatus, setTestCaseStatus] = useState<{[key: number]: 'pending' | 'running' | 'passed' | 'failed' | 'error'}>({});
  const [testCaseOutputs, setTestCaseOutputs] = useState<{[key: number]: any}>({});
  // Tab switching is now handled by the AntiCheat component
  const [isContestFinished, setIsContestFinished] = useState(false);
  const [isContestSubmitted, setIsContestSubmitted] = useState(false);
  const [mcqResults, setMcqResults] = useState<Record<string, { isCorrect: boolean; earnedPoints: number; correctAnswers: string[] }>>({});
  const [testStartTime, setTestStartTime] = useState<Date | null>(null);
  const [testCompletionTime, setTestCompletionTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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

  // Enter fullscreen and enable contest mode
  useEffect(() => {
    const onFullscreenChange = () => {
      const active = document.fullscreenElement !== null;
      if (active) {
        document.body.classList.add('contest-mode');
      } else {
        document.body.classList.remove('contest-mode');
      }
      setIsFullscreen(active);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);

    // Set test start time when contest begins
    if (isAuthenticated && contestId && !testStartTime) {
      setTestStartTime(new Date());
    }

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.body.classList.remove('contest-mode');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [isAuthenticated, contestId, testStartTime]);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(document.fullscreenElement !== null);

  const requestFullscreenWithFallback = async () => {
    try {
      const el: any = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      } else {
        throw new Error('Fullscreen API not supported');
      }
    } catch (error: any) {
      console.log('Fullscreen not available:', error);
      toast({
        title: 'Fullscreen blocked',
        description: 'Please click the button to allow fullscreen and make sure your browser allows it for this site.',
        variant: 'destructive',
      });
    }
  };

  // Update current time every second for real-time timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch contest data
  const { data: contest } = useQuery<{ id: string; title: string; startTime: string; endTime: string; isActive: boolean }>({
    queryKey: ['/api/contests', contestId],
    enabled: !!contestId && !!user,
  });

  // Fetch problems
  const { data: problems } = useQuery<Problem[]>({
    queryKey: ['/api/contests', contestId, 'problems'],
    enabled: !!contestId && !!user,
  });

  // Fetch current problem test cases
  const currentProblem = problems?.[currentProblemIndex];
  const { data: testCases, error: testCasesError, isLoading: testCasesLoading } = useQuery<TestCase[]>({
    queryKey: ['/api/problems', currentProblem?.id, 'testcases'],
    enabled: !!currentProblem?.id,
  });

  // Debug logging
  useEffect(() => {
    if (currentProblem?.id) {
      console.log('Fetching test cases for problem:', currentProblem.id);
    }
    if (testCases) {
      console.log('Test cases received:', testCases);
    }
    if (testCasesError) {
      console.error('Error fetching test cases:', testCasesError);
    }
  }, [currentProblem?.id, testCases, testCasesError]);

  // Reset test case statuses when problem changes
  useEffect(() => {
    if (currentProblem && testCases) {
      resetTestCaseStatuses();
    }
  }, [currentProblem?.id, testCases]);

  // Track tab switches - only when actually switching tabs, not continuously
  useEffect(() => {
    // Remove the continuous interval check - it was causing false positives
    // Tab switching will be detected by the AntiCheat component instead
  }, [contestId, user, toast]);

  // Fetch MCQ questions
  const { data: mcqQuestions } = useQuery<McqQuestion[]>({
    queryKey: ['/api/contests', contestId, 'mcq'],
    enabled: !!contestId && !!user,
  });

  // Fetch user submissions
  const { data: submissions } = useQuery<Submission[]>({
    queryKey: ['/api/submissions/user', user?.id],
    enabled: !!user?.id,
  });

  // Submit code mutation
  const submitCodeMutation = useMutation({
    mutationFn: async (data: { problemId: string; code: string; language: string }) => {
      return await apiRequest('POST', '/api/submissions', {
        problemId: data.problemId,
        contestId,
        code: data.code,
        language: data.language,
        status: 'pending'
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Code submitted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/submissions'] });
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
        description: "Failed to submit code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit MCQ mutation
  const submitMcqMutation = useMutation({
    mutationFn: async (data: { mcqQuestionId: string; selectedAnswers: string[] }) => {
      return await apiRequest('POST', '/api/submissions', {
        mcqQuestionId: data.mcqQuestionId,
        contestId,
        selectedAnswers: data.selectedAnswers,
        status: 'pending'
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "MCQ answer submitted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/submissions'] });
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
        description: "Failed to submit MCQ answer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetTestCaseStatuses = () => {
    if (!testCases) return;
    
    const initialStatus: {[key: number]: 'pending' | 'running' | 'passed' | 'failed' | 'error'} = {};
    const initialOutputs: {[key: number]: any} = {};
    
    testCases.forEach((_, index) => {
      initialStatus[index] = 'pending';
      initialOutputs[index] = null;
    });
    
    setTestCaseStatus(initialStatus);
    setTestCaseOutputs(initialOutputs);
    setTestResults([]);
    setSubmissionResults(null);
  };

  const handleTabSwitch = async (violationType: string) => {
    if (!contestId || !user) return;
    
    // Report every tab switch and let server enforce the threshold (>=3)
    if (violationType === 'tab_switch' || violationType === 'tab_switch_final' || violationType === 'tab_switch_limit') {
      try {
        const response = await apiRequest('POST', `/api/contests/${contestId}/tab-switch`, {});
        const result = await response.json();
        if (result?.disqualified) {
          toast({
            title: "Contest Failed",
            description: "You exceeded the tab switch limit. Your contest was auto-submitted.",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
        }
      } catch (error) {
        console.error('Failed to track tab switch:', error);
      }
    }
  };

  const handleContestTimeUp = () => {
    // Set completion time when contest ends
    if (!testCompletionTime) {
      setTestCompletionTime(new Date());
    }
    
    toast({
      title: "Time's Up!",
      description: "The contest has ended. Your work has been automatically submitted.",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/";
    }, 3000);
  };

  const runCode = async () => {
    if (!currentProblem || !testCases) {
      toast({
        title: "Error",
        description: "No problem or test cases available",
        variant: "destructive",
      });
      return;
    }
    
    if (testCases.length === 0) {
      toast({
        title: "No Test Cases",
        description: "This problem has no test cases available for execution",
        variant: "destructive",
      });
      return;
    }
    
    setIsRunning(true);
    
    // Reset test case statuses
    const initialStatus: {[key: number]: 'pending' | 'running' | 'passed' | 'failed' | 'error'} = {};
    const initialOutputs: {[key: number]: any} = {};
    testCases.forEach((_, index) => {
      initialStatus[index] = 'pending';
      initialOutputs[index] = null;
    });
    
    setTestCaseStatus(initialStatus);
    setTestCaseOutputs(initialOutputs);
    setTestResults([]);
    
    try {
      // Execute each test case individually
      let runPassedCount = 0;
      const totalCases = testCases.length;
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        // Set status to running
        setTestCaseStatus(prev => ({ ...prev, [i]: 'running' }));
        
        try {
          const response = await apiRequest('POST', '/api/execute-code', {
            code,
            language,
            problemId: currentProblem.id,
            testCaseIndex: i // Send specific test case index
          });

          if (response.ok) {
            const result = await response.json();
            
            // Update test case output
            setTestCaseOutputs(prev => ({ ...prev, [i]: result }));
            
            // Determine if test case passed (prefer server's decision which trims output)
            const passed = (typeof result.passed === 'boolean')
              ? result.passed
              : (String(result.actualOutput ?? '').trim() === String(testCase.expectedOutput ?? '').trim());
            const status = passed ? 'passed' : 'failed';
            if (passed) runPassedCount += 1;
            
            setTestCaseStatus(prev => ({ ...prev, [i]: status }));
            
            // Add to test results
            setTestResults(prev => [...prev, {
              ...result,
              passed,
              testCaseIndex: i
            }]);
            
            // Small delay to show the progression
            await new Promise(resolve => setTimeout(resolve, 300));
            
          } else {
            const error = await response.json();
            setTestCaseStatus(prev => ({ ...prev, [i]: 'error' }));
            setTestCaseOutputs(prev => ({ ...prev, [i]: { error: error.message } }));
          }
        } catch (error) {
          setTestCaseStatus(prev => ({ ...prev, [i]: 'error' }));
          setTestCaseOutputs(prev => ({ ...prev, [i]: { error: 'Execution failed' } }));
        }
      }
      
      // Show completion message using local counts to avoid stale state
      if (runPassedCount === totalCases) {
        toast({
          title: "Success",
          description: "All test cases passed!",
        });
      } else {
        toast({
          title: "Test Complete",
          description: `${runPassedCount}/${totalCases} test cases passed`,
          variant: runPassedCount > 0 ? "default" : "destructive",
        });
      }
      
    } catch (error) {
      console.error('Code execution failed:', error);
      toast({
        title: "Error",
        description: "Failed to execute code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const submitCode = () => {
    if (isContestSubmitted) {
      toast({ title: "Contest submitted", description: "You cannot submit again.", variant: "destructive" });
      return;
    }
    if (!currentProblem || !testCases) return;
    
    // Reset test case statuses for submission
    const initialStatus: {[key: number]: 'pending' | 'running' | 'passed' | 'failed' | 'error'} = {};
    testCases.forEach((_, index) => {
      initialStatus[index] = 'pending';
    });
    setTestCaseStatus(initialStatus);
    setTestCaseOutputs({});
    setTestResults([]);
    
    submitCodeMutation.mutate({
      problemId: currentProblem.id,
      code,
      language,
    }, {
      onSuccess: async (response: Response) => {
        try {
          const data = await response.json();
          console.log('Submission response:', data); // Debug logging
          
          if (data.evaluationResult) {
            setSubmissionResults(data.evaluationResult);
            
            // Update test case statuses based on submission results
            const newStatus: {[key: number]: 'pending' | 'running' | 'passed' | 'failed' | 'error'} = {};
            const newOutputs: {[key: number]: any} = {};
            
            if (data.evaluationResult.testResults && Array.isArray(data.evaluationResult.testResults)) {
              data.evaluationResult.testResults.forEach((result: any, index: number) => {
                if (result.error) {
                  newStatus[index] = 'error';
                  newOutputs[index] = { error: result.error };
                } else if (result.passed) {
                  newStatus[index] = 'passed';
                  newOutputs[index] = result;
                } else {
                  newStatus[index] = 'failed';
                  newOutputs[index] = result;
                }
              });
              
              setTestCaseStatus(newStatus);
              setTestCaseOutputs(newOutputs);
              setTestResults(data.evaluationResult.testResults);
            }
            
            // Show appropriate message based on result
            let message = "";
            let variant: "default" | "destructive" = "default";
            
            if (data.evaluationResult.status === 'accepted') {
              message = `🎉 Congratulations! All test cases passed. Score: ${data.evaluationResult.score}/${currentProblem.points}`;
              variant = "default";
            } else if (data.evaluationResult.status === 'partial_accepted') {
              message = `⚠️ Partially correct! Score: ${data.evaluationResult.score}/${currentProblem.points}`;
              variant = "destructive";
            } else if (data.evaluationResult.status === 'wrong_answer') {
              message = `❌ Incorrect solution. Score: ${data.evaluationResult.score}/${currentProblem.points}`;
              variant = "destructive";
            } else if (data.evaluationResult.status === 'runtime_error') {
              message = `💥 Runtime error occurred. Score: ${data.evaluationResult.score}/${currentProblem.points}`;
              variant = "destructive";
            } else if (data.evaluationResult.status === 'compilation_error') {
              message = `🔧 Compilation failed. Score: ${data.evaluationResult.score}/${currentProblem.points}`;
              variant = "destructive";
            } else if (data.evaluationResult.status === 'no_test_cases') {
              message = `⚠️ No test cases available for this problem.`;
              variant = "destructive";
            }
            
            toast({
              title: "Submission Result",
              description: message,
              variant: variant,
            });
          } else {
            // Handle case where no evaluation result is returned
            console.warn('No evaluation result in submission response:', data);
            toast({
              title: "Submission Complete",
              description: "Code submitted successfully, but evaluation is pending.",
              variant: "default",
            });
          }
        } catch (error) {
          console.error('Failed to parse submission response:', error);
          toast({
            title: "Error",
            description: "Failed to process submission result. Please check the console for details.",
            variant: "destructive",
          });
        }
      },
      onError: (error) => {
        console.error('Submission failed:', error);
        toast({
          title: "Submission Failed",
          description: "Failed to submit your code. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  // Finish contest: mark submitted then redirect
  const finishContest = async () => {
    try {
      const resp = await apiRequest('POST', `/api/contests/${contestId}/submit`, {});
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({} as any));
        throw new Error(err.message || 'Failed to submit contest');
      }
      setIsContestSubmitted(true);
      toast({ title: 'Contest Submitted', description: 'Returning to contests...' });
      setTimeout(() => { window.location.href = '/contests'; }, 800);
    } catch (e) {
      toast({ title: 'Submit Failed', description: e instanceof Error ? e.message : 'Please try again', variant: 'destructive' });
    }
  };

  const handleMcqAnswer = (questionId: string, optionIndex: string, isMultiple: boolean) => {
    setMcqAnswers(prev => {
      if (isMultiple) {
        const current = prev[questionId] || [];
        const updated = current.includes(optionIndex)
          ? current.filter(i => i !== optionIndex)
          : [...current, optionIndex];
        return { ...prev, [questionId]: updated };
      } else {
        return { ...prev, [questionId]: [optionIndex] };
      }
    });
  };

  const submitMcqAnswer = () => {
    const currentMcq = mcqQuestions?.[currentMcqIndex];
    if (!currentMcq) return;

    const selectedAnswers = mcqAnswers[currentMcq.id] || [];
    
    // Validate the current answer
    const result = validateMcqAnswer(currentMcq, selectedAnswers);
    setMcqResults(prev => ({
      ...prev,
      [currentMcq.id]: result
    }));
    
    submitMcqMutation.mutate({
      mcqQuestionId: currentMcq.id,
      selectedAnswers,
    });
  };

  const submitMcqAnswerAndNext = () => {
    const currentMcq = mcqQuestions?.[currentMcqIndex];
    if (!currentMcq) return;

    const selectedAnswers = mcqAnswers[currentMcq.id] || [];
    
    // Validate the current answer
    const result = validateMcqAnswer(currentMcq, selectedAnswers);
    setMcqResults(prev => ({
      ...prev,
      [currentMcq.id]: result
    }));
    
    submitMcqMutation.mutate({
      mcqQuestionId: currentMcq.id,
      selectedAnswers,
    }, {
      onSuccess: () => {
        if (currentMcqIndex < mcqQuestions.length - 1) {
          setTimeout(() => {
            setCurrentMcqIndex(Math.min(mcqQuestions.length - 1, currentMcqIndex + 1));
          }, 500);
        }
      }
    });
  };

  // Function to validate MCQ answers and calculate scores
  const validateMcqAnswer = (question: McqQuestion, selectedAnswers: string[]) => {
    const correctAnswers = question.options
      .map((option, index) => ({ ...option, index: index.toString() }))
      .filter(option => option.isCorrect)
      .map(option => option.index);

    const isCorrect = selectedAnswers.length === correctAnswers.length &&
      selectedAnswers.every(answer => correctAnswers.includes(answer)) &&
      correctAnswers.every(answer => selectedAnswers.includes(answer));

    const earnedPoints = isCorrect ? question.points : 0;

    return {
      isCorrect,
      earnedPoints,
      correctAnswers
    };
  };

  // Function to calculate total score
  const calculateTotalScore = () => {
    if (!mcqQuestions) return 0;
    return mcqQuestions.reduce((total, question) => {
      const result = mcqResults[question.id];
      return total + (result?.earnedPoints || 0);
    }, 0);
  };

  // Function to calculate total possible points
  const calculateTotalPossiblePoints = () => {
    if (!mcqQuestions) return 0;
    return mcqQuestions.reduce((total, question) => total + question.points, 0);
  };

  // Function to calculate time taken
  const calculateTimeTaken = () => {
    if (!testStartTime || !testCompletionTime) return null;
    
    const timeDiff = testCompletionTime.getTime() - testStartTime.getTime();
    const minutes = Math.floor(timeDiff / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    if (minutes === 0) {
      return `${seconds} seconds`;
    } else if (minutes === 1) {
      return `${minutes} minute ${seconds} seconds`;
    } else {
      return `${minutes} minutes ${seconds} seconds`;
    }
  };

  // Function to format time taken for display
  const formatTimeTaken = () => {
    const timeTaken = calculateTimeTaken();
    if (!timeTaken) return 'N/A';
    return timeTaken;
  };

  // Function to calculate current time elapsed
  const calculateCurrentTimeElapsed = () => {
    if (!testStartTime) return '00:00';
    
    const timeDiff = currentTime.getTime() - testStartTime.getTime();
    const minutes = Math.floor(timeDiff / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const submitMcqAnswerAndEndRound = () => {
    const currentMcq = mcqQuestions?.[currentMcqIndex];
    if (!currentMcq) return;

    const selectedAnswers = mcqAnswers[currentMcq.id] || [];
    
    // Validate the current answer
    const result = validateMcqAnswer(currentMcq, selectedAnswers);
    setMcqResults(prev => ({
      ...prev,
      [currentMcq.id]: result
    }));

    // Validate all answers before ending the round
    if (mcqQuestions) {
      const allResults: Record<string, { isCorrect: boolean; earnedPoints: number; correctAnswers: string[] }> = {};
      
      mcqQuestions.forEach(question => {
        const answers = mcqAnswers[question.id] || [];
        allResults[question.id] = validateMcqAnswer(question, answers);
      });
      
      setMcqResults(allResults);
    }

    submitMcqMutation.mutate({
      mcqQuestionId: currentMcq.id,
      selectedAnswers,
    }, {
      onSuccess: () => {
        setTestCompletionTime(new Date());
        setIsContestFinished(true);
        // Mark contest submitted on end of MCQ round
        finishContest();
        toast({
          title: "Round Completed!",
          description: "Your answers have been submitted. View your results below.",
          variant: "default",
        });
      }
    });
  };

  // Check if user is disqualified from this contest
  const { data: disqualificationStatus } = useQuery({
    queryKey: ['/api/contests', contestId, 'disqualified'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/contests/${contestId}/disqualified`);
      return response.json();
    },
    enabled: !!contestId && !!user,
  });

  // Fetch contest status (submitted/disqualified) and block if already submitted
  const { data: contestStatus } = useQuery({
    queryKey: ['/api/contests', contestId, 'status'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/contests/${contestId}/status`);
      return await response.json();
    },
    enabled: !!contestId,
    staleTime: 15000,
  });

  useEffect(() => {
    if (contestStatus?.isSubmitted) {
      setIsContestSubmitted(true);
    }
  }, [contestStatus]);

  // Redirect if disqualified
  useEffect(() => {
    if (disqualificationStatus?.isDisqualified) {
      toast({
        title: "Access Denied",
        description: "You are disqualified from this contest and cannot participate.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    }
  }, [disqualificationStatus, toast]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Contest not found</h1>
          <Button onClick={() => window.location.href = "/"}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AntiCheat
        isActive={true}
        onViolation={handleTabSwitch}
        maxTabSwitches={3}
        idleTimeout={30}
      />

      {/* Blocking Fullscreen Overlay */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 text-center space-y-4 border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Enter Fullscreen to Continue</h2>
            <p className="text-slate-600 text-sm">
              This exam requires fullscreen mode. Click the button below to enter fullscreen. If your browser blocks it, enable fullscreen permissions for this site and try again.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={requestFullscreenWithFallback} className="px-6">Enter Fullscreen</Button>
            </div>
            <p className="text-xs text-slate-500">Shortcut: press F11 on Windows/Linux.</p>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <nav className="bg-white shadow-lg border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Code className="text-white text-lg" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent">
                    Skillnox
                  </h1>
                  <p className="text-xs text-slate-500">Coding Excellence Platform</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <span className="text-xs text-slate-400">⚡</span>
                    <span className="text-xs text-slate-400">Powered by</span>
                    <span className="text-xs font-medium text-slate-600">KITS Akshar Institute of Technology</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <ContestTimer
                endTime={contest.endTime}
                onTimeUp={handleContestTimeUp}
                warningThreshold={10}
              />
              
              {/* Personal Timer */}
              {testStartTime && !isContestFinished && (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-lg border border-blue-200">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <div className="text-center">
                    <div className="text-sm font-semibold text-blue-900">Time Elapsed</div>
                    <div className="text-lg font-bold text-blue-700">{calculateCurrentTimeElapsed()}</div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-teal-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                  </p>
                  <p className="text-xs text-slate-500">{user.studentId || 'Student'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Contest Interface */}
      <div className="max-w-full mx-auto bg-slate-50">
        {isContestSubmitted ? (
          <div className="p-12 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Contest Already Submitted</h2>
            <p className="text-slate-600 mb-6">You have already submitted this contest and cannot participate again.</p>
            <Button onClick={() => (window.location.href = '/contests')} className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
              Return to Contests
            </Button>
          </div>
        ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tab Navigation */}
          <div className="bg-white border-b border-slate-200 px-6 sticky top-16 z-40">
            <TabsList className="h-auto p-0 bg-transparent flex gap-2 overflow-x-auto">
              <TabsTrigger 
                value="problems" 
                className="px-6 py-3 rounded-t-lg font-medium text-sm text-slate-600 hover:bg-slate-100 transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                data-testid="tab-problems"
              >
                <Code className="mr-2 w-4 h-4" />
                Problems ({problems?.length || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="mcq"
                className="px-6 py-3 rounded-t-lg font-medium text-sm text-slate-600 hover:bg-slate-100 transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                data-testid="tab-mcq"
              >
                <CheckCircle className="mr-2 w-4 h-4" />
                MCQ Questions ({mcqQuestions?.length || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="leaderboard"
                className="px-6 py-3 rounded-t-lg font-medium text-sm text-slate-600 hover:bg-slate-100 transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                data-testid="tab-leaderboard"
              >
                <Trophy className="mr-2 w-4 h-4" />
                Leaderboard
              </TabsTrigger>
              <TabsTrigger 
                value="submissions"
                className="px-6 py-3 rounded-t-lg font-medium text-sm text-slate-600 hover:bg-slate-100 transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                data-testid="tab-submissions"
              >
                <History className="mr-2 w-4 h-4" />
                My Submissions
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Problems Tab */}
          <TabsContent value="problems" className="flex-1 flex flex-col m-0 items-start">
            <div className="flex w-full h-full">
              {/* Left Panel - Problem Statement */}
              <div className="w-1/2 bg-white border-r border-slate-200 overflow-y-auto">
                <div className="p-6">
                  {currentProblem && (
                    <>
                      {/* Problem Navigation */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentProblemIndex(Math.max(0, currentProblemIndex - 1))}
                            disabled={currentProblemIndex === 0}
                            data-testid="button-previous-problem"
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Previous
                          </Button>
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold text-slate-800">
                              Problem {currentProblemIndex + 1}
                            </span>
                            <Badge className={getDifficultyColor(currentProblem.difficulty)}>
                              {currentProblem.difficulty}
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentProblemIndex(Math.min(problems.length - 1, currentProblemIndex + 1))}
                            disabled={currentProblemIndex === problems.length - 1}
                            data-testid="button-next-problem"
                          >
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {currentProblem.points} Points
                        </Badge>
                      </div>

                      {/* Problem Statement */}
                      <div className="prose max-w-none">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">
                          {currentProblem.title}
                        </h2>
                        <div className="bg-slate-50 rounded-lg p-4 mb-6">
                          <div 
                            className="text-slate-700"
                            dangerouslySetInnerHTML={{ __html: currentProblem.description }}
                          />
                        </div>

                        {/* Constraints */}
                        <div className="bg-orange-50 rounded-lg p-4 mb-6">
                          <h4 className="font-semibold text-orange-800 mb-2">Constraints:</h4>
                          <ul className="list-disc list-inside text-orange-700 space-y-1">
                            <li>Time Limit: {currentProblem.timeLimit}ms</li>
                            <li>Memory Limit: {currentProblem.memoryLimit}MB</li>
                          </ul>
                        </div>

                        {/* Test Cases Preview */}
                        {testCasesLoading && (
                          <div className="space-y-3">
                            <h4 className="font-semibold text-slate-800">Sample Test Cases:</h4>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mr-2"></div>
                                <span className="text-slate-600">Loading test cases...</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {testCasesError && (
                          <div className="space-y-3">
                            <h4 className="font-semibold text-slate-800">Sample Test Cases:</h4>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <div className="text-red-600">
                                Error loading test cases: {testCasesError.message || 'Unknown error'}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {testCases && testCases.length === 0 && (
                          <div className="space-y-3">
                            <h4 className="font-semibold text-slate-800">Sample Test Cases:</h4>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <div className="text-yellow-700">
                                No test cases available for this problem. Please contact an administrator.
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {testCases && testCases.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-semibold text-slate-800">Sample Test Cases:</h4>
                            <div className="grid gap-3">
                              {testCases.filter((tc: TestCase) => tc.isVisible).map((testCase: TestCase, index: number) => (
                                <div key={testCase.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-green-800">Test Case {index + 1}</span>
                                    <Eye className="w-4 h-4 text-green-600" />
                                  </div>
                                  <div className="font-mono text-sm text-slate-700">
                                    <div className="mb-1">
                                      <span className="font-semibold">Input:</span> {testCase.input}
                                    </div>
                                    <div>
                                      <span className="font-semibold">Expected:</span> {testCase.expectedOutput}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                              {testCases.filter((tc: TestCase) => !tc.isVisible).length > 0 && (
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-slate-600">Hidden Test Cases</span>
                                    <EyeOff className="w-4 h-4 text-slate-500" />
                                  </div>
                                  <div className="text-sm text-slate-600">
                                    {testCases.filter((tc: TestCase) => !tc.isVisible).length} additional test cases (used for final scoring)
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Panel - Code Editor */}
              <div className="w-1/2 bg-slate-900 flex flex-col">
                {/* Code Editor Header */}
                <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Select value={language} onValueChange={(lang) => {
                      setLanguage(lang);
                      // If the editor contains only the starter line(s), replace with language-specific starter
                      const current = (editorRef.current?.getValue() || code).trim();
                      const isDefault = current === "// Write your solution here" || current === "# Write your solution here";
                      if (isDefault) {
                        const starters: Record<string, string> = {
                          javascript: "// Write your solution here\n",
                          python: "# Write your solution here\n",
                          python3: "# Write your solution here\n",
                          java: "// Write your solution here\n",
                          cpp: "// Write your solution here\n",
                          c: "// Write your solution here\n",
                          csharp: "// Write your solution here\n",
                        };
                        const starter = starters[lang] || "// Write your solution here\n";
                        setCode(starter);
                        editorRef.current?.setValue(starter);
                      }
                    }}>
                      <SelectTrigger className="w-32 bg-slate-700 text-white border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="python3">Python 3</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                        <SelectItem value="cpp">C++</SelectItem>
                        <SelectItem value="c">C</SelectItem>
                        <SelectItem value="csharp">C#</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Auto-save enabled</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={runCode}
                      disabled={isRunning}
                      variant="secondary"
                      size="sm"
                      data-testid="button-run-code"
                    >
                      {isRunning ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mr-2"></div>
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Run Code
                    </Button>
                    <Button
                      onClick={submitCode}
                      disabled={submitCodeMutation.isPending}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                      size="sm"
                      data-testid="button-submit-code"
                    >
                      {submitCodeMutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Submit
                    </Button>
                  </div>
                </div>

                {/* Monaco Editor */}
                <div className="flex-1">
                  <MonacoEditor
                    ref={editorRef}
                    value={code}
                    language={language}
                    onChange={setCode}
                    theme="vs-dark"
                    height="100%"
                  />
                </div>

                {/* Test Results Panel */}
                {(testCases && testCases.length > 0) || testResults.length > 0 && (
                  <div className="bg-slate-800 border-t border-slate-700 p-4 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-white">Test Cases</h4>
                      <div className="flex items-center space-x-2">
                        {isRunning && (
                          <div className="flex items-center space-x-2 text-blue-400">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                            <span className="text-sm">Running...</span>
                          </div>
                        )}
                        {!isRunning && testCases && testCases.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              Object.values(testCaseStatus).every(status => status === 'passed') ? 'bg-green-500' : 
                              Object.values(testCaseStatus).some(status => status === 'passed') ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                            <span className="text-sm text-slate-300">
                              {Object.values(testCaseStatus).filter(status => status === 'passed').length}/{testCases.length} passed
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Test Case List */}
                    <div className="space-y-2">
                      {testCases?.map((testCase, index) => {
                        const status = testCaseStatus[index] || 'pending';
                        const output = testCaseOutputs[index];
                        
                        return (
                          <div
                            key={index}
                            className={`rounded-lg p-3 border transition-all duration-200 ${
                              status === 'pending' ? 'bg-slate-700 border-slate-600' :
                              status === 'running' ? 'bg-blue-900/50 border-blue-600' :
                              status === 'passed' ? 'bg-green-900/50 border-green-600' :
                              status === 'failed' ? 'bg-red-900/50 border-red-600' :
                              'bg-red-900/50 border-red-600'
                            }`}
                          >
                            {/* Test Case Header */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium">Test Case {index + 1}</span>
                              <div className="flex items-center space-x-2">
                                {status === 'pending' && (
                                  <div className="w-4 h-4 rounded-full border-2 border-slate-400"></div>
                                )}
                                {status === 'running' && (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                                )}
                                {status === 'passed' && (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                )}
                                {status === 'failed' && (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                )}
                                {status === 'error' && (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                )}
                                <span className={`text-xs px-2 py-1 rounded ${
                                  status === 'pending' ? 'bg-slate-600 text-slate-300' :
                                  status === 'running' ? 'bg-blue-600 text-white' :
                                  status === 'passed' ? 'bg-green-600 text-white' :
                                  status === 'failed' ? 'bg-red-600 text-white' :
                                  'bg-red-600 text-white'
                                }`}>
                                  {status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            
                            {/* Test Case Details */}
                            <div className="text-sm text-white/90 space-y-2">
                              <div>
                                <span className="font-semibold">Input:</span>
                                <code className="bg-slate-700 px-2 py-1 rounded ml-2 font-mono text-xs">
                                  {testCase.input || 'No input'}
                                </code>
                              </div>
                              <div>
                                <span className="font-semibold">Expected Output:</span>
                                <code className="bg-slate-700 px-2 py-1 rounded ml-2 font-mono text-xs">
                                  {testCase.expectedOutput}
                                </code>
                              </div>
                              
                              {/* Show output based on status */}
                              {status === 'running' && (
                                <div className="text-blue-400">
                                  <span className="font-semibold">Status:</span> Executing...
                                </div>
                              )}
                              
                              {status === 'passed' && output && (
                                <div>
                                  <span className="font-semibold text-green-400">Your Output:</span>
                                  <code className="bg-green-900/50 px-2 py-1 rounded ml-2 font-mono text-xs text-green-300">
                                    {output.actualOutput}
                                  </code>
                                  {output.executionTime && (
                                    <div className="text-xs text-slate-400 mt-1">
                                      Execution time: {output.executionTime}ms
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {status === 'failed' && output && (
                                <div>
                                  <span className="font-semibold text-red-400">Your Output:</span>
                                  <code className="bg-red-900/50 px-2 py-1 rounded ml-2 font-mono text-xs text-red-300">
                                    {output.actualOutput}
                                  </code>
                                  <div className="text-xs text-red-400 mt-1">
                                    Expected: {testCase.expectedOutput}
                                  </div>
                                </div>
                              )}
                              
                              {status === 'error' && output && output.error && (
                                <div className="mt-2 p-2 bg-red-900/30 rounded border border-red-700">
                                  <span className="font-semibold text-red-400">Error:</span>
                                  <div className="text-red-300 text-xs font-mono mt-1 whitespace-pre-wrap">
                                    {output.error}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Submission Results (if available) */}
                    {submissionResults && (
                      <div className="mt-4 p-3 bg-slate-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-semibold">Submission Result:</span>
                          <Badge 
                            variant={submissionResults.status === 'accepted' ? 'default' : 'destructive'}
                            className="ml-2"
                          >
                            {submissionResults.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-300 mt-2 space-y-1">
                          <div>Score: {submissionResults.score}/{currentProblem?.points || 0} points</div>
                          {submissionResults.executionTime && (
                            <div>Total Execution Time: {submissionResults.executionTime}ms</div>
                          )}
                          {submissionResults.memoryUsage && (
                            <div>Memory Usage: {submissionResults.memoryUsage}MB</div>
                          )}
                        </div>
                        {submissionResults.status === 'accepted' && !isContestSubmitted && (
                          <div className="mt-3">
                            <Button
                              onClick={finishContest}
                              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                              data-testid="button-finish-and-return"
                            >
                              Finish & Return to Contests
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* MCQ Tab */}
          <TabsContent value="mcq" className="flex-1 flex flex-col m-0 items-start">
            <div className="max-w-4xl mx-auto">
              {/* Debug: MCQ Tab Content Rendering */}
              {mcqQuestions && mcqQuestions.length > 0 ? (
                <>
                  {!isContestFinished ? (
                    <Card>
                      <div className="p-6 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-2xl font-bold text-slate-800">MCQ Questions</h2>
                            <p className="text-slate-600 mt-1">Answer all questions to complete this section</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-indigo-600">
                              Question {currentMcqIndex + 1}/{mcqQuestions.length}
                            </div>
                            <div className="text-sm text-slate-500">
                              {mcqQuestions[currentMcqIndex]?.points || 0} points
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                              Time: {calculateCurrentTimeElapsed()}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {mcqQuestions[currentMcqIndex] && (
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">
                          {mcqQuestions[currentMcqIndex].question}
                        </h3>
                        
                        <div className="space-y-3 mb-6">
                          {mcqQuestions[currentMcqIndex].options.map((option: any, optionIndex: number) => {
                            const isSelected = mcqAnswers[mcqQuestions[currentMcqIndex].id]?.includes(optionIndex.toString());
                            
                            return (
                              <label
                                key={optionIndex}
                                className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                                  isSelected 
                                    ? 'border-indigo-500 bg-indigo-50' 
                                    : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                                }`}
                                data-testid={`mcq-option-${optionIndex}`}
                              >
                                <input
                                  type={mcqQuestions[currentMcqIndex].isMultipleChoice ? "checkbox" : "radio"}
                                  name={`mcq-${mcqQuestions[currentMcqIndex].id}`}
                                  value={optionIndex}
                                  checked={isSelected}
                                  onChange={() => handleMcqAnswer(
                                    mcqQuestions[currentMcqIndex].id, 
                                    optionIndex.toString(),
                                    mcqQuestions[currentMcqIndex].isMultipleChoice
                                  )}
                                  className="text-indigo-600 focus:ring-indigo-500 mr-3"
                                />
                                <span className="text-slate-700">{option.text}</span>
                              </label>
                            );
                          })}
                        </div>
                        
                        {/* Navigation and Submit Section */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                          <Button
                            variant="outline"
                            onClick={() => setCurrentMcqIndex(Math.max(0, currentMcqIndex - 1))}
                            disabled={currentMcqIndex === 0}
                            data-testid="button-previous-mcq"
                          >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Previous Question
                          </Button>
                          
                          {/* Progress indicators - Show only every 3rd question or max 10 bars */}
                          <div className="flex space-x-1">
                            {(() => {
                              const totalQuestions = mcqQuestions.length;
                              const maxBars = Math.min(10, Math.ceil(totalQuestions / 3));
                              const step = Math.max(1, Math.floor(totalQuestions / maxBars));
                              
                              return Array.from({ length: maxBars }, (_, i) => {
                                const questionIndex = i * step;
                                const isCurrent = questionIndex === currentMcqIndex;
                                const isCompleted = questionIndex < currentMcqIndex;
                                const isFuture = questionIndex > currentMcqIndex;
                                
                                return (
                                  <div
                                    key={questionIndex}
                                    className={`w-3 h-2 rounded-full transition-colors duration-200 ${
                                      isCurrent
                                        ? 'bg-indigo-500'
                                        : isCompleted
                                        ? 'bg-green-500'
                                        : isFuture
                                        ? 'bg-slate-200'
                                        : 'bg-slate-100'
                                    }`}
                                    title={`Question ${questionIndex + 1}`}
                                  />
                                );
                              });
                            })()}
                          </div>
                          
                          <div className="flex space-x-2">
                            {!isContestFinished ? (
                              <>
                                {currentMcqIndex < mcqQuestions.length - 1 ? (
                                  <>
                                    <Button
                                      onClick={submitMcqAnswer}
                                      disabled={submitMcqMutation.isPending}
                                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                                      data-testid="button-submit-mcq"
                                    >
                                      {submitMcqMutation.isPending ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      ) : (
                                        <Send className="w-4 h-4 mr-2" />
                                      )}
                                      Submit
                                    </Button>
                                    
                                    <Button
                                      onClick={submitMcqAnswerAndNext}
                                      disabled={submitMcqMutation.isPending}
                                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
                                      data-testid="button-submit-next-mcq"
                                    >
                                      Next Question
                                      <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    onClick={submitMcqAnswerAndEndRound}
                                    disabled={submitMcqMutation.isPending}
                                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                                    data-testid="button-submit-end-round"
                                  >
                                    {submitMcqMutation.isPending ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    ) : (
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                    )}
                                    Submit Answer & End Round
                                  </Button>
                                )}
                              </>
                            ) : (
                              <div className="w-full text-center">
                                <Button
                                  onClick={() => window.location.href = "/"}
                                  className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                                >
                                  Return to Home
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ) : null}

              {/* Results Display */}
              {isContestFinished && (
                <Card className="mt-6">
                  <CardContent className="p-8">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Round Completed!</h2>
                      <p className="text-slate-600">Your answers have been submitted successfully.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg text-center">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-semibold text-blue-900 mb-1">Questions Answered</h3>
                        <p className="text-2xl font-bold text-blue-700">
                          {mcqQuestions?.length || 0}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg text-center">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Star className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-semibold text-green-900 mb-1">Points Earned</h3>
                        <p className="text-2xl font-bold text-green-700">
                          {calculateTotalScore()}/{calculateTotalPossiblePoints()}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg text-center">
                        <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Clock className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-semibold text-purple-900 mb-1">Time Taken</h3>
                        <p className="text-lg font-bold text-purple-700">
                          {formatTimeTaken()}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-lg">
                      <h3 className="font-semibold text-slate-900 mb-4">Your Answers Summary</h3>
                      <div className="space-y-3">
                        {mcqQuestions?.map((question, index) => {
                          const result = mcqResults[question.id];
                          const selectedAnswers = mcqAnswers[question.id] || [];
                          const correctAnswers = question.options
                            .map((option, idx) => ({ ...option, index: idx.toString() }))
                            .filter(option => option.isCorrect)
                            .map(option => option.index);
                          
                          return (
                            <div key={question.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                              result?.isCorrect 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-red-50 border-red-200'
                            }`}>
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  result?.isCorrect ? 'bg-green-500' : 'bg-red-500'
                                }`}>
                                  {result?.isCorrect ? (
                                    <CheckCircle className="w-4 h-4 text-white" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-white" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900 truncate max-w-md">
                                    {question.question}
                                  </p>
                                  <div className="text-sm text-slate-600 space-y-1">
                                    <p>Your answer: {selectedAnswers.length > 0 ? selectedAnswers.map(ans => 
                                      question.options[parseInt(ans)]?.text).join(', ') : 'No answer'}</p>
                                    <p>Correct answer: {correctAnswers.map(ans => 
                                      question.options[parseInt(ans)]?.text).join(', ')}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${
                                  result?.isCorrect ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {result?.earnedPoints || 0}/{question.points} pts
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="text-center mt-6">
                      <p className="text-slate-600 mb-4">
                        Your results will be available once the contest ends and all submissions are graded.
                      </p>
                      <Button
                        onClick={() => window.location.href = "/"}
                        className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                      >
                        Return to Home
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No MCQ questions</h3>
                <p className="text-slate-600">This contest doesn't have any MCQ questions</p>
              </CardContent>
            </Card>
          )}
            </div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="flex-1 flex flex-col m-0 items-start">
            <div className="max-w-4xl mx-auto">
              <Leaderboard contestId={contestId!} currentUserId={user?.id} />
            </div>
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions" className="flex-1 flex flex-col m-0 items-start">
            <div className="max-w-4xl mx-auto">
              <Card>
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-800">My Submissions</h2>
                  <p className="text-slate-600 mt-1">Track your submission history and results</p>
                </div>
                
                <CardContent className="p-0">
                  {submissions && submissions.length > 0 ? (
                    <div className="divide-y divide-slate-200">
                      {submissions.map((submission: Submission) => (
                        <div key={submission.id} className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                submission.status === 'accepted' 
                                  ? 'bg-green-500' 
                                  : submission.status === 'pending'
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}>
                                {submission.status === 'accepted' ? (
                                  <CheckCircle className="text-white w-5 h-5" />
                                ) : submission.status === 'pending' ? (
                                  <Clock className="text-white w-5 h-5" />
                                ) : (
                                  <XCircle className="text-white w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-800">
                                  {problems?.find(p => p.id === submission.id)?.title || 'Problem'}
                                </h3>
                                <p className="text-sm text-slate-600">
                                  Submitted {new Date(submission.submittedAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-bold capitalize ${
                                submission.status === 'accepted' ? 'text-green-600' : 
                                submission.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {submission.status.replace('_', ' ')}
                              </div>
                              <div className="text-sm text-slate-500">
                                Score: {submission.score} points
                              </div>
                            </div>
                          </div>
                          
                          {submission.executionTime && (
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-slate-500">Runtime:</span>
                                <span className="ml-2 font-medium">{submission.executionTime}ms</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Memory:</span>
                                <span className="ml-2 font-medium">{submission.memoryUsage}MB</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Language:</span>
                                <span className="ml-2 font-medium capitalize">{language}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No submissions yet</h3>
                      <p className="text-slate-600">Start solving problems to see your submission history</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        )}
      </div>
    </div>
  );
}
