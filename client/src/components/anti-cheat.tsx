import { useEffect, useState } from 'react';
import { AlertTriangle, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

interface AntiCheatProps {
  isActive?: boolean;
  onViolation?: (type: string) => void;
  maxTabSwitches?: number;
  idleTimeout?: number; // minutes
}

export default function AntiCheat({ 
  isActive = false, 
  onViolation,
  maxTabSwitches = 3,
  idleTimeout = 30
}: AntiCheatProps) {
  const [violations, setViolations] = useState<string[]>([]);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [idleTime, setIdleTime] = useState(0);
  const [isIdle, setIsIdle] = useState(false);

  // Tab visibility detection + fallbacks for environments where visibilitychange may not fire reliably
  useEffect(() => {
    if (!isActive) return;

    const lastTriggerTimeRef = { current: 0 };
    const cooldownMs = 750; // prevent double counting when multiple events fire together

    const incrementForTabLeave = (source: string) => {
      const now = Date.now();
      if (now - lastTriggerTimeRef.current < cooldownMs) return;
      lastTriggerTimeRef.current = now;

      setTabSwitches(prev => {
        const nextCount = prev + 1;

        // Show different warnings based on tab switch count
        if (nextCount < maxTabSwitches) {
          // Warnings before final
          if (nextCount === maxTabSwitches - 1) {
            showWarningModal('tab_switch_final');
            onViolation?.('tab_switch_final');
          } else {
            showWarningModal('tab_switch');
            onViolation?.('tab_switch');
          }
        } else {
          // Limit reached or exceeded
          showWarningModal('tab_switch_disqualified');
          onViolation?.('tab_switch_limit');
        }

        return nextCount;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        incrementForTabLeave('visibilitychange');
      }
    };

    const handleWindowBlur = () => {
      // Some environments report blur without visibilitychange; use document.hasFocus as a hint
      if (!document.hasFocus()) {
        incrementForTabLeave('blur');
      }
    };

    const handlePageHide = () => {
      incrementForTabLeave('pagehide');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isActive, maxTabSwitches, onViolation]);

  // Fullscreen monitoring
  useEffect(() => {
    if (!isActive) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = document.fullscreenElement !== null;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (!isCurrentlyFullscreen && violations.length === 0) {
        // First time exiting fullscreen - show warning
        showWarningModal('fullscreen_exit');
      } else if (!isCurrentlyFullscreen) {
        // Subsequent exits - violation
        addViolation('fullscreen_exit');
        onViolation?.('fullscreen_exit');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isActive, violations.length, onViolation]);

  // Idle time monitoring
  useEffect(() => {
    if (!isActive) return;

    let idleTimer: NodeJS.Timeout;
    let idleCounter = 0;

    const resetIdleTimer = () => {
      idleCounter = 0;
      setIdleTime(0);
      setIsIdle(false);
      clearInterval(idleTimer);
      
      idleTimer = setInterval(() => {
        idleCounter++;
        setIdleTime(idleCounter);
        
        if (idleCounter >= idleTimeout * 60) { // Convert minutes to seconds
          setIsIdle(true);
          showWarningModal('idle_timeout');
        }
      }, 1000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, true);
    });

    resetIdleTimer();

    return () => {
      clearInterval(idleTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetIdleTimer, true);
      });
    };
  }, [isActive, idleTimeout]);

  // Disable developer tools (basic attempt)
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (e.keyCode === 123 || 
          (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
          (e.ctrlKey && e.keyCode === 85)) {
        e.preventDefault();
        showWarningModal('devtools_attempt');
        addViolation('devtools_attempt');
        onViolation?.('devtools_attempt');
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onViolation]);

  const addViolation = (type: string) => {
    setViolations(prev => [...prev, type]);
  };

  const showWarningModal = (type: string) => {
    setWarningType(type);
    setShowWarning(true);
  };

  const closeWarning = () => {
    setShowWarning(false);
    setWarningType('');
  };

  const getWarningMessage = (type: string) => {
    switch (type) {
      case 'tab_switch':
        return {
          title: 'Tab Switch Detected!',
          message: `You have switched tabs ${tabSwitches} time(s). Please stay on this page.`,
          severity: 'warning'
        };
      case 'tab_switch_final':
        return {
          title: 'Last Warning!',
          message: `You have switched tabs ${tabSwitches} time(s). One more violation will result in disqualification.`,
          severity: 'error'
        };
      case 'tab_switch_disqualified':
        return {
          title: 'You are disqualified!',
          message: 'You have exceeded the maximum number of tab switches. Your contest has been automatically submitted.',
          severity: 'error'
        };
      case 'fullscreen_exit':
        return {
          title: 'Fullscreen Mode Exited!',
          message: 'Please return to fullscreen mode. Exiting fullscreen again will result in automatic submission.',
          severity: 'warning'
        };
      case 'idle_timeout':
        return {
          title: 'Idle Time Detected!',
          message: `You have been idle for ${Math.floor(idleTime / 60)} minutes. Your test will be auto-submitted if you remain idle.`,
          severity: 'warning'
        };
      case 'devtools_attempt':
        return {
          title: 'Developer Tools Blocked!',
          message: 'Attempting to open developer tools is not allowed during the contest.',
          severity: 'error'
        };
      default:
        return {
          title: 'Security Warning!',
          message: 'A security violation has been detected.',
          severity: 'warning'
        };
    }
  };

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
    }
  };

  if (!isActive) return null;

  const warning = getWarningMessage(warningType);

  return (
    <>
      {/* Security Status Indicator */}
      {isActive && (
        <div className="fixed top-4 right-4 z-40">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
          >
            <Shield className="w-4 h-4" />
            <span>Security Active</span>
          </motion.div>
        </div>
      )}

      {/* Warning Modal */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-red-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            data-testid="anti-cheat-warning"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <Card className="max-w-md w-full shadow-2xl">
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    warning.severity === 'error' 
                      ? 'bg-red-500' 
                      : 'bg-yellow-500'
                  }`}>
                    <AlertTriangle className="text-white text-2xl" />
                  </div>
                  
                  <h3 className={`text-2xl font-bold mb-2 ${
                    warning.severity === 'error' 
                      ? 'text-red-600' 
                      : 'text-yellow-600'
                  }`}>
                    {warning.title}
                  </h3>
                  
                  <p className="text-slate-700 mb-6">
                    {warning.message}
                  </p>

                  {warningType === 'fullscreen_exit' && !isFullscreen && (
                    <Button
                      onClick={enterFullscreen}
                      className="bg-blue-500 hover:bg-blue-600 text-white mb-4 w-full"
                      data-testid="button-enter-fullscreen"
                    >
                      Return to Fullscreen
                    </Button>
                  )}
                  
                  <Button 
                    onClick={closeWarning}
                    className={`w-full ${
                      warning.severity === 'error' 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-yellow-500 hover:bg-yellow-600'
                    } text-white`}
                    data-testid="button-acknowledge-warning"
                  >
                    I Understand
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Violation Summary (for debugging/admin) */}
      {violations.length > 0 && process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 z-40">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-3">
              <div className="text-sm text-red-800">
                <div className="font-semibold mb-1">Security Violations:</div>
                <ul className="list-disc list-inside space-y-1">
                  {violations.map((violation, index) => (
                    <li key={index}>{violation.replace('_', ' ')}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
