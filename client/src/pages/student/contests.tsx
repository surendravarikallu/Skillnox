import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Code, 
  Calendar,
  Clock,
  Users,
  PlayCircle,
  CheckCircle,
  AlertCircle,
  Timer,
  XCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import ProfileDialog from "@/components/profile-dialog";

export default function StudentContests() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();

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

  const { data: contests, isLoading: contestsLoading } = useQuery<any[]>({
    queryKey: ['/api/contests'],
    enabled: !!user,
  });

  const { data: activeContests } = useQuery<any[]>({
    queryKey: ['/api/contests/active'],
    enabled: !!user,
  });

  // Check disqualification status for all contests
  const { data: disqualificationStatuses } = useQuery({
    queryKey: ['/api/contests/disqualifications'],
    queryFn: async () => {
      if (!contests) return {};
      
      const statuses: Record<string, boolean> = {};
      await Promise.all(
        (contests || []).map(async (contest: any) => {
          try {
            const response = await apiRequest('GET', `/api/contests/${contest.id}/disqualified`);
            const result = await response.json();
            statuses[contest.id] = result.isDisqualified;
          } catch (error) {
            console.error(`Failed to check disqualification for contest ${contest.id}:`, error);
            statuses[contest.id] = false;
          }
        })
      );
      return statuses;
    },
    enabled: !!user && !!contests,
  });

  const joinContestMutation = useMutation({
    mutationFn: async (contestId: string) => {
      return await apiRequest('POST', `/api/contests/${contestId}/join`, {});
    },
    onSuccess: (_, contestId) => {
      toast({
        title: "Success",
        description: "Successfully joined the contest!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contests'] });
      // Redirect to contest taking page
      window.location.href = `/contest/${contestId}`;
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
      
      // Check if it's a disqualification error
      if (error instanceof Error && error.message.includes('disqualified')) {
        toast({
          title: "Access Denied",
          description: "You are disqualified from this contest and cannot rejoin.",
          variant: "destructive",
        });
        // Refresh disqualification statuses
        queryClient.invalidateQueries({ queryKey: ['/api/contests/disqualifications'] });
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to join contest. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        // Clear any local state and redirect to home
        window.location.href = '/';
      } else {
        console.error('Logout failed');
        // Force redirect anyway
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect anyway
      window.location.href = '/';
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const getContestStatus = (contest: any) => {
    const now = new Date();
    const startTime = new Date(contest.startTime);
    const endTime = new Date(contest.endTime);

    if (contest.isActive && now >= startTime && now <= endTime) {
      return { 
        status: 'active', 
        label: 'Live Now', 
        color: 'bg-green-500 text-white',
        icon: <PlayCircle className="w-4 h-4" />,
        canJoin: true
      };
    } else if (now < startTime) {
      return { 
        status: 'upcoming', 
        label: 'Upcoming', 
        color: 'bg-blue-500 text-white',
        icon: <Timer className="w-4 h-4" />,
        canJoin: false
      };
    } else {
      return { 
        status: 'ended', 
        label: 'Ended', 
        color: 'bg-gray-500 text-white',
        icon: <CheckCircle className="w-4 h-4" />,
        canJoin: false
      };
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getTimeUntilStart = (startTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Trophy className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Available Contests</h1>
                <p className="text-slate-600">Join contests and test your coding skills</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-slate-100 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-slate-700">
                  {activeContests?.length || 0} Live Contests
                </span>
              </div>
              {user && <ProfileDialog user={user} />}
              <Button 
                variant="outline"
                onClick={handleLogout}
                data-testid="button-logout"
                className="text-red-600 hover:text-red-700"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Contests Section */}
        {activeContests && (activeContests as any[]).length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              Live Contests
            </h2>
            <div className="grid gap-6">
              {(activeContests as any[]).map((contest: any, index: number) => {
                const status = getContestStatus(contest);
                return (
                  <motion.div
                    key={contest.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className="border-l-4 border-green-500 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center animate-pulse">
                              <PlayCircle className="text-white w-8 h-8" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-slate-900 mb-2">
                                {contest.title}
                              </h3>
                              <div className="flex items-center space-x-4 text-sm text-slate-600 mb-2">
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{contest.duration} minutes</span>
                                </div>
                                <Badge className={status.color}>
                                  {status.icon}
                                  <span className="ml-1">{status.label}</span>
                                </Badge>
                              </div>
                              {contest.description && (
                                <p className="text-sm text-slate-600 max-w-lg">
                                  {contest.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            {disqualificationStatuses?.[contest.id] ? (
                              <Button
                                disabled
                                className="bg-red-500 text-white font-semibold px-6 py-3 rounded-lg"
                                data-testid={`button-disqualified-${contest.id}`}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Disqualified
                              </Button>
                            ) : (
                              <Button
                                onClick={() => joinContestMutation.mutate(contest.id)}
                                disabled={joinContestMutation.isPending}
                                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105"
                                data-testid={`button-join-contest-${contest.id}`}
                              >
                                {joinContestMutation.isPending ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                ) : (
                                  <PlayCircle className="w-4 h-4 mr-2" />
                                )}
                                Join Contest
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Contests Section */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">All Contests</h2>
          
          {contestsLoading ? (
            <div className="grid gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                      <div className="h-4 bg-slate-200 rounded w-full"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : contests && (contests as any[]).length > 0 ? (
            <div className="grid gap-4">
              {(contests as any[]).map((contest: any, index: number) => {
                const status = getContestStatus(contest);
                const startDateTime = formatDateTime(contest.startTime);
                const endDateTime = formatDateTime(contest.endTime);
                const timeUntil = getTimeUntilStart(contest.startTime);

                return (
                  <motion.div
                    key={contest.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow duration-200">
                      <CardContent className="p-6">
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
                                    {startDateTime.date} {startDateTime.time} - {endDateTime.date} {endDateTime.time}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{contest.duration} min</span>
                                </div>
                                {timeUntil && (
                                  <div className="flex items-center space-x-1 text-blue-600">
                                    <Timer className="w-4 h-4" />
                                    <span>Starts in {timeUntil}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <Badge className={status.color}>
                              {status.icon}
                              <span className="ml-1">{status.label}</span>
                            </Badge>
                            
                            {disqualificationStatuses?.[contest.id] ? (
                              <Button disabled variant="outline" className="text-red-600 border-red-300">
                                <XCircle className="w-4 h-4 mr-2" />
                                Disqualified
                              </Button>
                            ) : status.canJoin ? (
                              <Button
                                onClick={() => joinContestMutation.mutate(contest.id)}
                                disabled={joinContestMutation.isPending}
                                className="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700"
                                data-testid={`button-join-contest-${contest.id}`}
                              >
                                {joinContestMutation.isPending ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                ) : (
                                  <PlayCircle className="w-4 h-4 mr-2" />
                                )}
                                Join Now
                              </Button>
                            ) : status.status === 'upcoming' ? (
                              <Button disabled variant="outline">
                                <Timer className="w-4 h-4 mr-2" />
                                Upcoming
                              </Button>
                            ) : (
                              <Button disabled variant="outline">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Ended
                              </Button>
                            )}
                          </div>
                        </div>

                        {contest.description && (
                          <p className="mt-3 text-sm text-slate-600 pl-16">
                            {contest.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No contests available</h3>
                <p className="text-slate-600">Check back later for new contests</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
