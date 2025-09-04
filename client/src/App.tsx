import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminContests from "@/pages/admin/contests";
import CreateContest from "@/pages/admin/create-contest";
import EditContest from "@/pages/admin/edit-contest";
import ViewContest from "@/pages/admin/view-contest";
import ViewStudents from "@/pages/admin/view-students";
import ImportQuestions from "@/pages/admin/import-questions";
import ImportStudents from "@/pages/admin/import-students";
import ExportReports from "@/pages/admin/export-reports";
import StudentContests from "@/pages/student/contests";
import ContestTaking from "@/pages/student/contest-taking";
import AntiCheat from "@/components/anti-cheat";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }



  return (
    <Switch>
      {!isAuthenticated ? (
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/login" component={AuthPage} />
          <Route path="/signin" component={AuthPage} />
          <Route component={NotFound} />
        </Switch>
      ) : user && user.role === 'admin' ? (
        <Switch>
          <Route path="/" component={AdminDashboard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/contests" component={AdminContests} />
          <Route path="/admin/create-contest" component={CreateContest} />
          <Route path="/admin/edit-contest/:id" component={EditContest} />
          <Route path="/admin/view-contest/:contestId" component={ViewContest} />
          <Route path="/admin/view-students" component={ViewStudents} />
          <Route path="/admin/import-questions" component={ImportQuestions} />
          <Route path="/admin/import-students" component={ImportStudents} />
          <Route path="/admin/export-reports" component={ExportReports} />
          <Route component={NotFound} />
        </Switch>
      ) : (
        <Switch>
          <Route path="/" component={StudentContests} />
          <Route path="/contests" component={StudentContests} />
          <Route path="/contest/:contestId" component={ContestTaking} />
          <Route component={NotFound} />
        </Switch>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AntiCheat />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
