import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Code, 
  Calendar,
  Clock,
  Users,
  Trophy,
  CheckCircle,
  AlertTriangle,
  Edit,
  Eye
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function ViewContest() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { contestId } = useParams();

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

  // Fetch contest data
  const { data: contest, isLoading: contestLoading } = useQuery({
    queryKey: ['/api/contests', contestId],
    enabled: !!contestId && !!user && user.role === 'admin',
  });

  // Fetch contest problems
  const { data: problems } = useQuery({
    queryKey: ['/api/contests', contestId, 'problems'],
    enabled: !!contestId && !!user && user.role === 'admin',
  });

  // Fetch contest MCQ questions
  const { data: mcqQuestions } = useQuery({
    queryKey: ['/api/contests', contestId, 'mcq'],
    enabled: !!contestId && !!user && user.role === 'admin',
  });

  // Fetch contest participants
  const { data: participants } = useQuery({
    queryKey: ['/api/contests', contestId, 'participants'],
    enabled: !!contestId && !!user && user.role === 'admin',
  });

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

  if (contestLoading) {
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
          <Link href="/admin/contests">
            <Button>Back to Contests</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getContestStatus = () => {
    const now = new Date();
    const startTime = new Date(contest.startTime);
    const endTime = new Date(contest.endTime);

    if (contest.isActive && now >= startTime && now <= endTime) {
      return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-800' };
    } else if (now < startTime) {
      return { status: 'upcoming', label: 'Upcoming', color: 'bg-blue-100 text-blue-800' };
    } else {
      return { status: 'ended', label: 'Ended', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const status = getContestStatus();

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
                  <Trophy className="text-white text-lg" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{contest.title}</h1>
                  <p className="text-slate-600">Contest Details and Analytics</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge className={status.color}>
                {status.label}
              </Badge>
              <Link href={`/admin/edit-contest/${contest.id}`}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Contest
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Contest Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Duration</p>
                  <p className="text-2xl font-bold text-slate-900">{contest.duration} min</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Problems</p>
                  <p className="text-2xl font-bold text-slate-900">{problems?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Code className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">MCQ Questions</p>
                  <p className="text-2xl font-bold text-slate-900">{mcqQuestions?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Participants</p>
                  <p className="text-2xl font-bold text-slate-900">{participants?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contest Details Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="problems">Problems</TabsTrigger>
            <TabsTrigger value="mcq">MCQ Questions</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contest Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Description</h4>
                    <p className="text-slate-600">{contest.description || "No description provided"}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Schedule</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span>Start: {new Date(contest.startTime).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span>End: {new Date(contest.endTime).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="problems" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Programming Problems</CardTitle>
              </CardHeader>
              <CardContent>
                {problems && problems.length > 0 ? (
                  <div className="space-y-4">
                    {problems.map((problem: any, index: number) => (
                      <div key={problem.id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-slate-900">
                            Problem {index + 1}: {problem.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{problem.difficulty}</Badge>
                            <Badge variant="secondary">{problem.points} points</Badge>
                          </div>
                        </div>
                        <p className="text-slate-600 text-sm mb-2">{problem.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-slate-500">
                          <span>Time Limit: {problem.timeLimit}ms</span>
                          <span>Memory Limit: {problem.memoryLimit}MB</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Code className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No problems yet</h3>
                    <p className="text-slate-600">Add programming problems to this contest</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mcq" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>MCQ Questions</CardTitle>
              </CardHeader>
              <CardContent>
                {mcqQuestions && mcqQuestions.length > 0 ? (
                  <div className="space-y-4">
                    {mcqQuestions.map((question: any, index: number) => (
                      <div key={question.id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-slate-900">
                            Question {index + 1}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {question.isMultipleChoice ? "Multiple Choice" : "Single Choice"}
                            </Badge>
                            <Badge variant="secondary">{question.points} points</Badge>
                          </div>
                        </div>
                        <p className="text-slate-600 mb-3">{question.question}</p>
                        <div className="space-y-2">
                          {question.options.map((option: any, optionIndex: number) => (
                            <div key={optionIndex} className="flex items-center space-x-2 text-sm">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                option.isCorrect ? 'border-green-500 bg-green-500' : 'border-slate-300'
                              }`}>
                                {option.isCorrect && <div className="w-2 h-2 bg-white rounded-full"></div>}
                              </div>
                              <span className={option.isCorrect ? 'text-green-700 font-medium' : 'text-slate-600'}>
                                {option.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No MCQ questions yet</h3>
                    <p className="text-slate-600">Add MCQ questions to this contest</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contest Participants</CardTitle>
              </CardHeader>
              <CardContent>
                {participants && participants.length > 0 ? (
                  <div className="space-y-4">
                    {participants.map((participant: any, index: number) => (
                      <div key={participant.id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-slate-900">
                              {participant.user?.firstName} {participant.user?.lastName}
                            </h4>
                            <p className="text-sm text-slate-600">{participant.user?.email}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-slate-900">{participant.totalScore} points</div>
                            <div className="text-sm text-slate-500">
                              {participant.isDisqualified ? (
                                <span className="text-red-600">Disqualified</span>
                              ) : (
                                <span>Active</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No participants yet</h3>
                    <p className="text-slate-600">Students will appear here once they join the contest</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
