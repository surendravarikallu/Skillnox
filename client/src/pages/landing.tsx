import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Code, Trophy, Users, Zap, ArrowRight, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Landing() {
  const [showAuthError, setShowAuthError] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authError = urlParams.get('auth_error');
    if (authError) {
      setShowAuthError(true);
      // Clean URL without triggering navigation
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const getErrorMessage = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorType = urlParams.get('auth_error');
    
    switch (errorType) {
      case 'auth_failed':
        return 'Authentication failed. Please try logging in again.';
      case 'no_user':
        return 'User authentication incomplete. Please try again.';
      case 'login_failed':
        return 'Login process failed. Please try again.';
      default:
        return 'Authentication failed. Please try again.';
    }
  };

  const features = [
    {
      icon: <Code className="w-8 h-8" />,
      title: "Professional Editor",
      description: "Advanced code editor with syntax highlighting and intelligent suggestions",
    },
    {
      icon: <Trophy className="w-8 h-8" />,
      title: "Skill Assessment",
      description: "Comprehensive programming challenges to evaluate your abilities",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Performance Tracking",
      description: "Monitor your progress and compare with peers",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Instant Evaluation",
      description: "Get immediate feedback on your code submissions",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              className="flex items-center space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Code className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent">
                  Skillnox
                </h1>
                <p className="text-xs text-slate-500">Programming Skill Evaluation Platform</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Button 
                onClick={() => window.location.href = '/auth'}
                className="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                data-testid="button-login"
              >
                Sign In
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          {showAuthError && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 max-w-2xl mx-auto"
            >
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  {getErrorMessage()}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-amber-800 underline ml-1"
                    onClick={() => setShowAuthError(false)}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-teal-100 to-indigo-100 text-teal-800 px-4 py-2 rounded-full text-sm font-medium">
                <Zap className="w-4 h-4" />
                <span>Advanced Programming Assessment Platform</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-slate-900 leading-tight">
                Evaluate Your Skills with
                <span className="block bg-gradient-to-r from-teal-500 to-indigo-600 bg-clip-text text-transparent">
                  Skillnox
                </span>
              </h1>

              <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Demonstrate your programming expertise through comprehensive assessments. 
                Real-time coding challenges, detailed performance analysis, and skill development tracking.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  onClick={() => window.location.href = '/auth'}
                  size="lg"
                  className="bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  data-testid="button-get-started"
                >
                  Start Assessment
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                
                <div className="text-sm text-slate-500 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Trusted by hundreds of students</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-teal-200/30 to-indigo-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-l from-indigo-200/20 to-teal-200/20 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Why Choose Skillnox?
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Designed for comprehensive programming skill evaluation and development
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 border-slate-200 hover:border-teal-300">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-teal-600">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-teal-500 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="space-y-8"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Showcase Your Programming Skills?
            </h2>
            <p className="text-xl text-teal-100 max-w-2xl mx-auto">
              Join students who are advancing their programming capabilities through structured assessments
            </p>
            <Button 
              onClick={() => window.location.href = '/auth'}
              size="lg"
              variant="secondary"
              className="bg-white text-teal-600 hover:bg-slate-50 font-semibold px-8 py-4 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              data-testid="button-join-now"
            >
              Begin Your Assessment
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Code className="text-white text-sm" />
            </div>
            <span className="text-xl font-bold">Skillnox</span>
          </div>
          <p className="text-slate-400">
            © 2025 Developed by Varikallu Surendra(23JK1A05I7) & T&P CELL || Skillnox. Advancing programming excellence through comprehensive skill evaluation.
          </p>
        </div>
      </footer>
    </div>
  );
}
