import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Trophy, 
  Code, 
  TrendingUp, 
  Plus, 
  Upload,
  Download,
  Crown,
  Activity,
  FileText
} from "lucide-react";
import { motion } from "framer-motion";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

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

  const { data: activeContests } = useQuery<any[]>({
    queryKey: ['/api/contests/active'],
    enabled: !!user && user.role === 'admin',
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: !!user && user.role === 'admin',
  });

  const { data: submissions } = useQuery<any[]>({
    queryKey: ['/api/submissions'],
    enabled: !!user && user.role === 'admin',
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

  // Calculate real statistics
  const totalStudents = users?.filter((u: any) => u.role === 'student').length || 0;
  const totalSubmissions = submissions?.length || 0;
  const successfulSubmissions = submissions?.filter((s: any) => s.status === 'accepted').length || 0;
  const successRate = totalSubmissions > 0 ? Math.round((successfulSubmissions / totalSubmissions) * 100) : 0;

  const stats = [
    {
      title: "Total Students",
      value: totalStudents.toString(),
      change: "+0",
      icon: <Users className="w-6 h-6" />,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Active Contests",
      value: activeContests?.length.toString() || "0",
      change: "+0",
      icon: <Trophy className="w-6 h-6" />,
      color: "from-green-500 to-green-600",
    },
    {
      title: "Total Contests",
      value: contests?.length.toString() || "0",
      change: "+0",
      icon: <Activity className="w-6 h-6" />,
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Success Rate",
      value: `${successRate}%`,
      change: "+0%",
      icon: <TrendingUp className="w-6 h-6" />,
      color: "from-orange-500 to-orange-600",
    },
  ];

  const quickActions = [
    {
      title: "Create Contest",
      description: "Set up a new coding contest with problems and MCQs",
      icon: <Plus className="w-6 h-6" />,
      href: "/admin/create-contest",
      color: "from-teal-500 to-teal-600",
    },
    {
      title: "Manage Contests",
      description: "View and edit existing contests",
      icon: <Trophy className="w-6 h-6" />,
      href: "/admin/contests",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      title: "Import Students",
      description: "Bulk upload student data via CSV file",
      icon: <Upload className="w-6 h-6" />,
      href: "/admin/import-students",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Import Questions",
      description: "Bulk upload questions and problems via CSV file",
      icon: <FileText className="w-6 h-6" />,
      href: "/admin/import-questions",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Export Reports",
      description: "Generate detailed analytics and performance reports",
      icon: <Download className="w-6 h-6" />,
      href: "/admin/export-reports",
      color: "from-green-500 to-green-600",
    },
  ];

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Crown className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-slate-600">Manage contests and monitor student progress</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Create and download CSV template for questions
                  const csvContent = `Type,Title,Description,Difficulty,Points,TimeLimit,Question,Options,CorrectAnswers,Input,ExpectedOutput,IsVisible,TestCasePoints
coding,Two Sum,Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.,easy,40,5000,,,,"[2,7,11,15]",9,true,20
coding,Reverse String,Write a function that reverses a string.,easy,30,3000,,,,"hello","olleh",true,15
mcq,What is 2+2?,Basic arithmetic question,medium,5,0,What is 2+2?,"4,5,6,7",0,,,true,5
mcq,Capital of France,Geography question,medium,5,0,What is the capital of France?,"London,Paris,Berlin,Madrid",1,,,true,5`;
                  
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
                    description: "CSV template downloaded. Fill it with questions data and use the Import Questions button below.",
                  });
                }}
                className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                <Download className="w-4 h-4" />
                Download Questions Template
              </Button>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                System Online
              </Badge>
              <Button 
                onClick={handleLogout}
                variant="outline"
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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1">
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-br ${stat.color} rounded-t-lg p-6 text-white`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="opacity-80">{stat.icon}</div>
                      <Badge variant="secondary" className="bg-white/20 text-white border-0">
                        {stat.change}
                      </Badge>
                    </div>
                    <div className="text-3xl font-bold mb-1">{stat.value}</div>
                    <div className="text-sm opacity-80">{stat.title}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              >
                <Link href={action.href}>
                  <Card className="h-full hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 cursor-pointer group">
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform duration-200`}>
                        {action.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-teal-600 transition-colors duration-200">
                        {action.title}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {action.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Contests */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Recent Contests</h2>
            <Link href="/admin/contests">
              <Button variant="outline" data-testid="button-view-all-contests">
                View All Contests
              </Button>
            </Link>
          </div>
          
          <div className="grid gap-4">
            {contestsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ) : contests && contests.length > 0 ? (
              contests.slice(0, 5).map((contest: any, index: number) => (
                <motion.div
                  key={contest.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                >
                  <Card className="hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Code className="text-white w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{contest.title}</h3>
                            <p className="text-sm text-slate-600">
                              {new Date(contest.startTime).toLocaleDateString()} - {new Date(contest.endTime).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {contest.isActive && (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          )}
                          <Badge variant="outline">{contest.duration} min</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No contests yet</h3>
                  <p className="text-slate-600 mb-4">Create your first contest to get started</p>
                  <Link href="/admin/create-contest">
                    <Button data-testid="button-create-first-contest">
                      Create Contest
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
