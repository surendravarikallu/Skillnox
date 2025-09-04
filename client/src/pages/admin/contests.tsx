import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Code, 
  Calendar,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowLeft
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function AdminContests() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [deletingContestId, setDeletingContestId] = useState<string | null>(null);

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

  const { data: contests, isLoading: contestsLoading } = useQuery<any[]>({
    queryKey: ['/api/contests'],
    enabled: !!user && user.role === 'admin',
  });

  // Delete contest mutation
  const deleteContestMutation = useMutation({
    mutationFn: async (contestId: string) => {
      return await apiRequest('DELETE', `/api/contests/${contestId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contest deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contests'] });
      setDeletingContestId(null);
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
        description: "Failed to delete contest. Please try again.",
        variant: "destructive",
      });
      setDeletingContestId(null);
    },
  });

  const handleViewContest = (contestId: string) => {
    // Navigate to contest details or view page
    setLocation(`/admin/view-contest/${contestId}`);
  };

  const handleEditContest = (contestId: string) => {
    setLocation(`/admin/edit-contest/${contestId}`);
  };

  const handleDeleteContest = async (contestId: string) => {
    if (window.confirm("Are you sure you want to delete this contest? This action cannot be undone.")) {
      setDeletingContestId(contestId);
      deleteContestMutation.mutate(contestId);
    }
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

  const getContestStatus = (contest: any) => {
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm" data-testid="button-back-to-dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Trophy className="text-white text-lg" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Contest Management</h1>
                  <p className="text-slate-600">Manage all contests and competitions</p>
                </div>
              </div>
            </div>
            
            <Link href="/admin/create-contest">
              <Button 
                className="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700"
                data-testid="button-create-contest"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Contest
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Contests</p>
                  <p className="text-2xl font-bold text-slate-900">{contests?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Contests</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {contests?.filter((c: any) => getContestStatus(c).status === 'active').length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Upcoming Contests</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {contests?.filter((c: any) => getContestStatus(c).status === 'upcoming').length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contests List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5" />
              <span>All Contests</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {contestsLoading ? (
              <div className="p-8">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-slate-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : contests && contests.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {contests.map((contest: any, index: number) => {
                  const status = getContestStatus(contest);
                  return (
                    <motion.div
                      key={contest.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-6 hover:bg-slate-50 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Code className="text-white w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">
                              {contest.title}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-slate-600">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {new Date(contest.startTime).toLocaleDateString()} - {new Date(contest.endTime).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{contest.duration} minutes</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Badge className={status.color}>
                            {status.label}
                          </Badge>
                          
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewContest(contest.id)}
                              data-testid={`button-view-contest-${contest.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditContest(contest.id)}
                              data-testid={`button-edit-contest-${contest.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteContest(contest.id)}
                              disabled={deletingContestId === contest.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              data-testid={`button-delete-contest-${contest.id}`}
                            >
                              {deletingContestId === contest.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {contest.description && (
                        <p className="mt-3 text-sm text-slate-600 pl-16">
                          {contest.description}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No contests yet</h3>
                <p className="text-slate-600 mb-6">Create your first contest to get started</p>
                <Link href="/admin/create-contest">
                  <Button data-testid="button-create-first-contest">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Contest
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
