import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Medal, Users, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';

interface LeaderboardProps {
  contestId: string;
  currentUserId?: string;
}

interface LeaderboardEntry {
  userId: string;
  firstName: string;
  lastName: string;
  studentId: string;
  email: string;
  totalScore: number;
  submittedAt: string | null;
  joinedAt: string;
  isDisqualified: boolean;
}

export default function Leaderboard({ contestId, currentUserId }: LeaderboardProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [liveUpdates, setLiveUpdates] = useState<any[]>([]);

  const { data: leaderboard, isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/contests', contestId, 'leaderboard'],
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  // Setup Socket.IO for real-time updates
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit('join-contest', contestId);

    newSocket.on('submission-update', (update) => {
      setLiveUpdates(prev => [...prev, update]);
      // Refetch leaderboard to get updated data
      setTimeout(() => refetch(), 1000);
    });

    newSocket.on('leaderboard-update', () => {
      refetch();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [contestId, refetch]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-slate-600 font-bold">{rank}</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'leaderboard-gold border-2 border-yellow-300';
      case 2:
        return 'leaderboard-silver border-2 border-gray-300';
      case 3:
        return 'leaderboard-bronze border-2 border-amber-300';
      default:
        return 'bg-white hover:bg-slate-50';
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - new Date(leaderboard?.[0]?.joinedAt || now).getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getDisplayName = (entry: LeaderboardEntry) => {
    const fullName = `${entry.firstName || ''} ${entry.lastName || ''}`.trim();
    return fullName || entry.email?.split('@')[0] || 'Anonymous';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span>Live Leaderboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-slate-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span>Live Leaderboard</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-slate-600">Updates live</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {leaderboard && leaderboard.length > 0 ? (
          <div className="divide-y divide-slate-200">
            <AnimatePresence>
              {leaderboard.map((entry: LeaderboardEntry, index: number) => {
                const rank = index + 1;
                const isCurrentUser = entry.userId === currentUserId;
                
                return (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`p-4 transition-all duration-200 ${getRankStyle(rank)} ${
                      isCurrentUser ? 'ring-2 ring-teal-500 ring-opacity-50' : ''
                    }`}
                    data-testid={`leaderboard-entry-${entry.userId}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getRankIcon(rank)}
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {getDisplayName(entry).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          
                          <div>
                            <div className="flex items-center space-x-2">
                              <div className="font-medium text-slate-900">
                                {getDisplayName(entry)}
                              </div>
                              {isCurrentUser && (
                                <Badge variant="secondary" className="text-xs">You</Badge>
                              )}
                              {entry.isDisqualified && (
                                <Badge variant="destructive" className="text-xs">DQ</Badge>
                              )}
                            </div>
                            {entry.studentId && (
                              <div className="text-sm text-slate-500">{entry.studentId}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900 mb-1">
                          {entry.totalScore}
                        </div>
                        <div className="text-sm text-slate-500">
                          {entry.submittedAt ? formatTime(entry.submittedAt) : 'In Progress'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No participants yet</h3>
            <p className="text-slate-600">The leaderboard will update as students join and submit solutions</p>
          </div>
        )}

        {/* Live Update Notifications */}
        <AnimatePresence>
          {liveUpdates.slice(-3).map((update, index) => (
            <motion.div
              key={`${update.submissionId}-${index}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50"
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">
                  New submission scored {update.score} points!
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
