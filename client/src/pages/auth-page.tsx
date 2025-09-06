import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Code, LogIn, AlertCircle, Eye, EyeOff, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface LoginData {
  username: string;
  password: string;
}



export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [loginData, setLoginData] = useState<LoginData>({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  if (user) {
    if (user.role === 'admin') {
      setLocation('/admin');
    } else {
      setLocation('/contests');
    }
    return null;
  }

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest('POST', '/api/auth/login', credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Login failed');
      }
      return await res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/auth/user'], user);
      if (user.role === 'admin') {
        setLocation('/admin');
      } else {
        setLocation('/contests');
      }
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });



  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate(loginData);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Auth Forms */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md mx-auto"
        >
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Code className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent">
                  Skillnox
                </h1>
                <p className="text-sm text-slate-500">Coding Excellence Platform</p>
                <div className="flex items-center space-x-1 mt-1">
                  <span className="text-xs text-slate-400">⚡</span>
                  <span className="text-xs text-slate-400">Powered by</span>
                  <span className="text-xs font-medium text-slate-600">KITS Akshar Institute of Technology</span>
                </div>
              </div>
            </div>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-center text-slate-700">Welcome Back</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input
                    id="login-username"
                    type="text"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    placeholder="Enter your username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      placeholder="Enter your password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Side - Hero Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="hidden lg:block"
        >
          <div className="text-center lg:text-left">
            <h2 className="text-4xl font-bold text-slate-800 mb-6">
              Master Your <span className="bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent">Coding Skills</span>
            </h2>
            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
              Join our interactive coding platform featuring live contests, real-time leaderboards, and comprehensive skill assessment tools.
            </p>
            
            <div className="grid grid-cols-2 gap-6 text-left">
              <div className="p-4 bg-white/50 rounded-lg backdrop-blur-sm">
                <Code className="w-8 h-8 text-teal-600 mb-3" />
                <h3 className="font-semibold text-slate-800 mb-2">Monaco Editor</h3>
                <p className="text-sm text-slate-600">Professional IDE experience with syntax highlighting and auto-completion.</p>
              </div>
              <div className="p-4 bg-white/50 rounded-lg backdrop-blur-sm">
                <LogIn className="w-8 h-8 text-indigo-600 mb-3" />
                <h3 className="font-semibold text-slate-800 mb-2">Live Contests</h3>
                <p className="text-sm text-slate-600">Participate in real-time coding competitions with instant feedback.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}