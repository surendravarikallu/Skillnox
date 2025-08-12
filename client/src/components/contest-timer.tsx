import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface ContestTimerProps {
  endTime: string;
  onTimeUp?: () => void;
  warningThreshold?: number; // minutes before end to show warning
}

export default function ContestTimer({ 
  endTime, 
  onTimeUp, 
  warningThreshold = 10 
}: ContestTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    total: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ total: 0, hours: 0, minutes: 0, seconds: 0 });

  const [isWarning, setIsWarning] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const difference = end - now;

      if (difference <= 0) {
        setTimeLeft({ total: 0, hours: 0, minutes: 0, seconds: 0 });
        if (!hasEnded) {
          setHasEnded(true);
          onTimeUp?.();
        }
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      const totalMinutes = Math.floor(difference / (1000 * 60));

      setTimeLeft({ total: difference, hours, minutes, seconds });
      setIsWarning(totalMinutes <= warningThreshold && totalMinutes > 0);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime, onTimeUp, warningThreshold, hasEnded]);

  const formatTime = (time: number) => {
    return time.toString().padStart(2, '0');
  };

  const getTimerColor = () => {
    if (hasEnded) return 'bg-red-500 text-white';
    if (isWarning) return 'bg-yellow-500 text-white animate-pulse';
    return 'bg-slate-100 text-slate-700';
  };

  const getTimerIcon = () => {
    if (hasEnded || isWarning) return <AlertTriangle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-center space-x-2"
    >
      <Badge 
        className={`${getTimerColor()} px-4 py-2 text-sm font-mono transition-all duration-200`}
        data-testid="contest-timer"
      >
        <div className="flex items-center space-x-2">
          {getTimerIcon()}
          <span>
            {hasEnded 
              ? 'Time Up!' 
              : `${formatTime(timeLeft.hours)}:${formatTime(timeLeft.minutes)}:${formatTime(timeLeft.seconds)}`
            }
          </span>
        </div>
      </Badge>
      
      {isWarning && !hasEnded && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xs text-yellow-600 font-medium"
        >
          Time running out!
        </motion.div>
      )}
    </motion.div>
  );
}
