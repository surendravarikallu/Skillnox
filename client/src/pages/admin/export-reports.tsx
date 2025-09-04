import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Crown, 
  Download, 
  FileText, 
  Users, 
  Trophy, 
  BarChart3,
  Calendar,
  TrendingUp,
  Award,
  Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import ProfileDialog from "@/components/profile-dialog";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Contest {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  totalParticipants?: number;
  averageScore?: number;
}

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export default function ExportReports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [selectedContest, setSelectedContest] = useState<string>("");
  const [selectedReportType, setSelectedReportType] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Redirect to home if not authenticated
  if (!isLoading && !isAuthenticated) {
            window.location.href = "/auth";
    return null;
  }

  // Fetch contests
  const { data: contests } = useQuery<Contest[]>({
    queryKey: ['/api/contests'],
    enabled: !!user,
  });

  // Fetch contest submissions for real data
  const { data: submissions } = useQuery<any[]>({
    queryKey: ['/api/submissions'],
    enabled: !!user,
  });

  // Fetch contest participants
  const { data: participants } = useQuery<any[]>({
    queryKey: ['/api/participants'],
    enabled: !!user,
  });

  // Fetch contest questions
  const { data: questions } = useQuery<any[]>({
    queryKey: ['/api/questions'],
    enabled: !!user,
  });

  const reportTypes: ReportType[] = [
    {
      id: "performance",
      title: "Performance Report",
      description: "Detailed analysis of student performance and scores",
      icon: <BarChart3 className="w-6 h-6" />,
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "participation",
      title: "Participation Report",
      description: "Student participation statistics and attendance",
      icon: <Users className="w-6 h-6" />,
      color: "from-green-500 to-green-600",
    },
    {
      id: "leaderboard",
      title: "Leaderboard Report",
      description: "Complete ranking and leaderboard data",
      icon: <Trophy className="w-6 h-6" />,
      color: "from-yellow-500 to-yellow-600",
    },
    {
      id: "analytics",
      title: "Analytics Report",
      description: "Comprehensive analytics and insights",
      icon: <TrendingUp className="w-6 h-6" />,
      color: "from-purple-500 to-purple-600",
    },
    {
      id: "timing",
      title: "Timing Report",
      description: "Time analysis and completion statistics",
      icon: <Clock className="w-6 h-6" />,
      color: "from-orange-500 to-orange-600",
    },
    {
      id: "summary",
      title: "Summary Report",
      description: "Executive summary with key metrics",
      icon: <Award className="w-6 h-6" />,
      color: "from-red-500 to-red-600",
    },
  ];

  const generateReport = async () => {
    if (!selectedContest || !selectedReportType) {
      toast({
        title: "Selection Required",
        description: "Please select both a contest and report type.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const contest = contests?.find(c => c.id === selectedContest);
      
      // Get real data for the selected contest
      const contestSubmissions = submissions?.filter(s => s.contestId === selectedContest) || [];
      const contestParticipants = participants?.filter(p => p.contestId === selectedContest) || [];
      const contestQuestions = questions?.filter(q => q.contestId === selectedContest) || [];
      
      // Calculate real metrics
      const totalParticipants = contestParticipants.length;
      const completedSubmissions = contestSubmissions.filter(s => s.status === 'completed');
      const completionRate = totalParticipants > 0 ? (completedSubmissions.length / totalParticipants * 100).toFixed(1) : 0;
      
      // Calculate scores
      const scores = completedSubmissions.map(s => s.score || 0);
      const averageScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
      const topScore = scores.length > 0 ? Math.max(...scores) : 0;
      
      // Calculate time metrics
      const completionTimes = completedSubmissions
        .filter(s => s.submittedAt && s.startedAt)
        .map(s => {
          const start = new Date(s.startedAt);
          const end = new Date(s.submittedAt);
          return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
        });
      
      const averageTime = completionTimes.length > 0 
        ? (completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length).toFixed(1) + ' minutes'
        : 'N/A';
      
      const fastestTime = completionTimes.length > 0 ? Math.min(...completionTimes).toFixed(1) + ' minutes' : 'N/A';
      const slowestTime = completionTimes.length > 0 ? Math.max(...completionTimes).toFixed(1) + ' minutes' : 'N/A';
      
      // Calculate accuracy metrics
      const totalQuestionsAnswered = contestSubmissions.reduce((sum, s) => sum + (s.questionsAnswered || 0), 0);
      const totalCorrectAnswers = contestSubmissions.reduce((sum, s) => sum + (s.correctAnswers || 0), 0);
      const accuracyRate = totalQuestionsAnswered > 0 ? (totalCorrectAnswers / totalQuestionsAnswered * 100).toFixed(1) : 0;
      
      // Create comprehensive report data
      const reportData = {
        contestId: selectedContest,
        reportType: selectedReportType,
        generatedAt: new Date().toISOString(),
        contest: contest,
        data: {
          totalParticipants,
          completedParticipants: completedSubmissions.length,
          averageScore: parseFloat(averageScore),
          topScore,
          completionRate: parseFloat(completionRate),
          averageTime,
          fastestTime,
          slowestTime,
          questionsAnswered: totalQuestionsAnswered,
          correctAnswers: totalCorrectAnswers,
          accuracyRate: parseFloat(accuracyRate),
          totalQuestions: contestQuestions.length,
          submissions: contestSubmissions,
          participants: contestParticipants,
          questions: contestQuestions
        }
      };
      
             // Create PDF document
       const doc = new jsPDF();
       
       // Add professional header with logo placeholder
       doc.setFillColor(59, 130, 246); // blue-500
       doc.rect(0, 0, 210, 40, 'F');
       
       doc.setFontSize(28);
       doc.setTextColor(255, 255, 255);
               doc.text('Skillnox', 20, 25);
       
       doc.setFontSize(14);
       doc.setTextColor(219, 234, 254); // blue-100
       doc.text('Professional Contest Management System', 20, 35);
       
       // Add report title
       doc.setFontSize(20);
       doc.setTextColor(30, 41, 59); // slate-800
       doc.text(`${reportTypes.find(r => r.id === selectedReportType)?.title}`, 20, 55);
       
       // Add contest info section
       doc.setFontSize(12);
       doc.setTextColor(71, 85, 105); // slate-600
       doc.text(`Contest: ${contest?.title || 'Unknown'}`, 20, 70);
       doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 80);
       
       if (contest?.startTime && contest?.endTime) {
         doc.text(`Duration: ${new Date(contest.startTime).toLocaleDateString()} - ${new Date(contest.endTime).toLocaleDateString()}`, 20, 90);
       }
       
       // Add separator line
       doc.setDrawColor(203, 213, 225); // slate-300
       doc.line(20, 100, 190, 100);
       
       let yPosition = 115;
      
      // Generate content based on report type
      switch (selectedReportType) {
        case "performance":
          generatePerformanceReport(doc, reportData, contest, yPosition);
          break;
        case "participation":
          generateParticipationReport(doc, reportData, contest, yPosition);
          break;
        case "leaderboard":
          generateLeaderboardReport(doc, reportData, contest, yPosition);
          break;
        case "analytics":
          generateAnalyticsReport(doc, reportData, contest, yPosition);
          break;
        case "timing":
          generateTimingReport(doc, reportData, contest, yPosition);
          break;
        case "summary":
          generateSummaryReport(doc, reportData, contest, yPosition);
          break;
        default:
          generateGeneralReport(doc, reportData, contest, yPosition);
      }
      
             // Add professional footer
       const pageCount = doc.getNumberOfPages();
       for (let i = 1; i <= pageCount; i++) {
         doc.setPage(i);
         
         // Footer background
         doc.setFillColor(248, 250, 252); // slate-50
         doc.rect(0, 280, 210, 20, 'F');
         
         // Footer border
         doc.setDrawColor(203, 213, 225); // slate-300
         doc.line(20, 280, 190, 280);
         
         doc.setFontSize(9);
         doc.setTextColor(100, 116, 139); // slate-500
         doc.text(`Page ${i} of ${pageCount}`, 20, 290);
         doc.text('Skillnox - Professional Contest Management System', 20, 295);
         doc.text(`Report ID: ${Date.now()}`, 150, 290);
       }

      // Download the PDF
      const fileName = `${contest?.title || 'contest'}-${selectedReportType}-report-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "Report Generated",
        description: `${reportTypes.find(r => r.id === selectedReportType)?.title} has been downloaded successfully.`,
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper functions for different report types
  const generatePerformanceReport = (doc: jsPDF, reportData: any, contest: any, startY: number) => {
    // Executive Summary
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('Executive Summary', 20, startY);
    
    // Key metrics in a highlighted box
    doc.setFillColor(239, 246, 255); // blue-50
    doc.rect(20, startY + 10, 170, 40, 'F');
    doc.setDrawColor(59, 130, 246); // blue-500
    doc.rect(20, startY + 10, 170, 40, 'S');
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Participants: ${reportData.data.totalParticipants}`, 25, startY + 25);
    doc.text(`Average Score: ${reportData.data.averageScore}%`, 25, startY + 35);
    doc.text(`Top Score: ${reportData.data.topScore}%`, 25, startY + 45);
    
    doc.text(`Completion Rate: ${reportData.data.completionRate}%`, 110, startY + 25);
    doc.text(`Accuracy Rate: ${reportData.data.accuracyRate}%`, 110, startY + 35);
    doc.text(`Average Time: ${reportData.data.averageTime}`, 110, startY + 45);
    
    // Detailed Performance Metrics
    const metricsY = startY + 70;
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Detailed Performance Metrics', 20, metricsY);
    
    const metrics = [
      ['Metric', 'Value', 'Status'],
      ['Total Participants', reportData.data.totalParticipants.toString(), ''],
      ['Completed Participants', reportData.data.completedParticipants.toString(), ''],
      ['Average Score', `${reportData.data.averageScore}%`, reportData.data.averageScore >= 70 ? 'Good' : 'Needs Improvement'],
      ['Top Score', `${reportData.data.topScore}%`, 'Excellent'],
      ['Completion Rate', `${reportData.data.completionRate}%`, reportData.data.completionRate >= 80 ? 'Good' : 'Low'],
      ['Average Time', reportData.data.averageTime, ''],
      ['Fastest Time', reportData.data.fastestTime, ''],
      ['Slowest Time', reportData.data.slowestTime, ''],
      ['Questions Answered', reportData.data.questionsAnswered.toString(), ''],
      ['Correct Answers', reportData.data.correctAnswers.toString(), ''],
      ['Accuracy Rate', `${reportData.data.accuracyRate}%`, reportData.data.accuracyRate >= 75 ? 'Good' : 'Needs Improvement']
    ];
    
    autoTable(doc, {
      startY: metricsY + 10,
      head: [['Metric', 'Value', 'Status']],
      body: metrics.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 11 },
      styles: { fontSize: 10 },
      columnStyles: {
        2: { cellWidth: 30 }
      }
    });
    
    // Score Distribution Analysis
    const distributionY = startY + 140;
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Score Distribution Analysis', 20, distributionY);
    
    // Calculate score distribution
    const scores = reportData.data.submissions?.map((s: any) => s.score || 0).filter((s: number) => s > 0) || [];
    const excellent = scores.filter((s: number) => s >= 90).length;
    const good = scores.filter((s: number) => s >= 70 && s < 90).length;
    const average = scores.filter((s: number) => s >= 50 && s < 70).length;
    const belowAverage = scores.filter((s: number) => s < 50).length;
    
    const distributionData = [
      ['Score Range', 'Count', 'Percentage'],
      ['90-100 (Excellent)', excellent.toString(), scores.length > 0 ? `${(excellent / scores.length * 100).toFixed(1)}%` : '0%'],
      ['70-89 (Good)', good.toString(), scores.length > 0 ? `${(good / scores.length * 100).toFixed(1)}%` : '0%'],
      ['50-69 (Average)', average.toString(), scores.length > 0 ? `${(average / scores.length * 100).toFixed(1)}%` : '0%'],
      ['0-49 (Below Average)', belowAverage.toString(), scores.length > 0 ? `${(belowAverage / scores.length * 100).toFixed(1)}%` : '0%']
    ];
    
    autoTable(doc, {
      startY: distributionY + 10,
      head: [['Score Range', 'Count', 'Percentage']],
      body: distributionData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 11 },
      styles: { fontSize: 10 }
    });
  };

  const generateParticipationReport = (doc: jsPDF, reportData: any, contest: any, startY: number) => {
    // Participation Overview
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('Participation Overview', 20, startY);
    
    // Key participation metrics in a highlighted box
    doc.setFillColor(240, 253, 244); // green-50
    doc.rect(20, startY + 10, 170, 40, 'F');
    doc.setDrawColor(34, 197, 94); // green-500
    doc.rect(20, startY + 10, 170, 40, 'S');
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Registered: ${reportData.data.totalParticipants}`, 25, startY + 25);
    doc.text(`Active Participants: ${reportData.data.completedParticipants}`, 25, startY + 35);
    doc.text(`Participation Rate: ${reportData.data.completionRate}%`, 25, startY + 45);
    
    doc.text(`Start Date: ${contest?.startTime ? new Date(contest.startTime).toLocaleDateString() : 'N/A'}`, 110, startY + 25);
    doc.text(`End Date: ${contest?.endTime ? new Date(contest.endTime).toLocaleDateString() : 'N/A'}`, 110, startY + 35);
    doc.text(`Duration: ${contest?.startTime && contest?.endTime ? 
      Math.ceil((new Date(contest.endTime).getTime() - new Date(contest.startTime).getTime()) / (1000 * 60 * 60 * 24)) + ' days' : 'N/A'}`, 110, startY + 45);
    
    // Detailed Participation Statistics
    const statsY = startY + 70;
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Detailed Participation Statistics', 20, statsY);
    
    const inactiveParticipants = reportData.data.totalParticipants - reportData.data.completedParticipants;
    const participationRate = reportData.data.completionRate;
    
    const metrics = [
      ['Metric', 'Count', 'Percentage', 'Status'],
      ['Total Registered', reportData.data.totalParticipants.toString(), '100%', ''],
      ['Active Participants', reportData.data.completedParticipants.toString(), `${participationRate}%`, participationRate >= 80 ? 'Good' : 'Low'],
      ['Inactive Participants', inactiveParticipants.toString(), `${(100 - participationRate).toFixed(1)}%`, ''],
      ['Questions Attempted', reportData.data.questionsAnswered.toString(), '', ''],
      ['Correct Answers', reportData.data.correctAnswers.toString(), '', ''],
      ['Accuracy Rate', '', `${reportData.data.accuracyRate}%`, reportData.data.accuracyRate >= 75 ? 'Good' : 'Needs Improvement']
    ];
    
    autoTable(doc, {
      startY: statsY + 10,
      head: [['Metric', 'Count', 'Percentage', 'Status']],
      body: metrics.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 11 },
      styles: { fontSize: 10 },
      columnStyles: {
        3: { cellWidth: 25 }
      }
    });
    
    // Participation Timeline Analysis
    const timelineY = startY + 140;
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Participation Timeline Analysis', 20, timelineY);
    
    // Calculate participation over time
    const submissions = reportData.data.submissions || [];
    const submissionTimes = submissions
      .filter((s: any) => s.submittedAt)
      .map((s: any) => new Date(s.submittedAt))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());
    
    if (submissionTimes.length > 0) {
      const firstSubmission = submissionTimes[0];
      const lastSubmission = submissionTimes[submissionTimes.length - 1];
      const totalDuration = (lastSubmission.getTime() - firstSubmission.getTime()) / (1000 * 60 * 60); // hours
      
      const timelineData = [
        ['Event', 'Date/Time', 'Participants'],
        ['First Submission', firstSubmission.toLocaleString(), '1'],
        ['Last Submission', lastSubmission.toLocaleString(), submissionTimes.length.toString()],
        ['Peak Activity', 'N/A', 'N/A'],
        ['Total Duration', `${totalDuration.toFixed(1)} hours`, ''],
        ['Average Submissions/Hour', `${(submissionTimes.length / totalDuration).toFixed(1)}`, '']
      ];
      
      autoTable(doc, {
        startY: timelineY + 10,
        head: [['Event', 'Date/Time', 'Participants']],
        body: timelineData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 11 },
        styles: { fontSize: 10 }
      });
    }
  };

  const generateLeaderboardReport = (doc: jsPDF, reportData: any, contest: any, startY: number) => {
    // Leaderboard Overview
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('Leaderboard Rankings', 20, startY);
    
    // Top performers highlight box
    doc.setFillColor(255, 251, 235); // yellow-50
    doc.rect(20, startY + 10, 170, 30, 'F');
    doc.setDrawColor(245, 158, 11); // yellow-500
    doc.rect(20, startY + 10, 170, 30, 'S');
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Participants: ${reportData.data.totalParticipants}`, 25, startY + 25);
    doc.text(`Top Score: ${reportData.data.topScore}%`, 25, startY + 35);
    doc.text(`Average Score: ${reportData.data.averageScore}%`, 110, startY + 25);
    doc.text(`Completion Rate: ${reportData.data.completionRate}%`, 110, startY + 35);
    
    // Generate real leaderboard data
    const submissions = reportData.data.submissions || [];
    const leaderboardData = submissions
      .filter((s: any) => s.status === 'completed' && s.score !== undefined)
      .map((s: any) => {
        const participant = reportData.data.participants?.find((p: any) => p.id === s.participantId);
        const timeTaken = s.submittedAt && s.startedAt ? 
          ((new Date(s.submittedAt).getTime() - new Date(s.startedAt).getTime()) / (1000 * 60)).toFixed(1) + ' min' : 'N/A';
        
        return {
          score: s.score || 0,
          participantId: s.participantId,
          name: participant?.name || 'Unknown',
          timeTaken,
          questionsAnswered: s.questionsAnswered || 0,
          correctAnswers: s.correctAnswers || 0
        };
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 20); // Top 20
    
    if (leaderboardData.length > 0) {
      const tableData = leaderboardData.map((entry: any, index: number) => [
        (index + 1).toString(),
        entry.participantId || 'N/A',
        entry.name,
        `${entry.score}%`,
        entry.timeTaken,
        `${entry.correctAnswers}/${entry.questionsAnswered}`
      ]);
      
      autoTable(doc, {
        startY: startY + 60,
        head: [['Rank', 'Student ID', 'Name', 'Score', 'Time Taken', 'Questions Answered']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11], textColor: 255, fontSize: 11 },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 25 },
          2: { cellWidth: 40 },
          3: { cellWidth: 20 },
          4: { cellWidth: 25 },
          5: { cellWidth: 30 }
        }
      });
    } else {
      doc.setFontSize(14);
      doc.setTextColor(100, 116, 139);
      doc.text('No completed submissions found for this contest.', 20, startY + 80);
    }
    
    // Performance Statistics
    const statsY = startY + (leaderboardData.length > 0 ? 200 : 120);
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Performance Statistics', 20, statsY);
    
    const stats = [
      ['Statistic', 'Value'],
      ['Total Submissions', submissions.length.toString()],
      ['Completed Submissions', submissions.filter((s: any) => s.status === 'completed').length.toString()],
      ['Average Score', `${reportData.data.averageScore}%`],
      ['Median Score', 'N/A'], // Could calculate if needed
      ['Standard Deviation', 'N/A'], // Could calculate if needed
      ['Fastest Completion', reportData.data.fastestTime],
      ['Slowest Completion', reportData.data.slowestTime]
    ];
    
    autoTable(doc, {
      startY: statsY + 10,
      head: [['Statistic', 'Value']],
      body: stats.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [251, 191, 36], textColor: 255, fontSize: 11 },
      styles: { fontSize: 10 }
    });
  };

  const generateAnalyticsReport = (doc: jsPDF, reportData: any, contest: any, startY: number) => {
    // Analytics Overview
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('Analytics Insights', 20, startY);
    
    // Key insights highlight box
    doc.setFillColor(250, 245, 255); // purple-50
    doc.rect(20, startY + 10, 170, 40, 'F');
    doc.setDrawColor(147, 51, 234); // purple-500
    doc.rect(20, startY + 10, 170, 40, 'S');
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Questions: ${reportData.data.totalQuestions}`, 25, startY + 25);
    doc.text(`Questions Attempted: ${reportData.data.questionsAnswered}`, 25, startY + 35);
    doc.text(`Success Rate: ${reportData.data.accuracyRate}%`, 25, startY + 45);
    
    doc.text(`Avg Time/Question: ${reportData.data.averageTime}`, 110, startY + 25);
    doc.text(`Completion Rate: ${reportData.data.completionRate}%`, 110, startY + 35);
    doc.text(`Total Participants: ${reportData.data.totalParticipants}`, 110, startY + 45);
    
    // Question Analysis
    const questionY = startY + 70;
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Question Analysis', 20, questionY);
    
    const questions = reportData.data.questions || [];
    const submissions = reportData.data.submissions || [];
    
    // Calculate question difficulty based on success rate
    const questionStats = questions.map((q: any) => {
      const questionSubmissions = submissions.filter((s: any) => 
        s.questionAnswers && s.questionAnswers[q.id]
      );
      const correctAnswers = questionSubmissions.filter((s: any) => 
        s.questionAnswers[q.id] === q.correctAnswer
      ).length;
      const successRate = questionSubmissions.length > 0 ? 
        (correctAnswers / questionSubmissions.length * 100).toFixed(1) : 0;
      
      return {
        id: q.id,
        title: q.title || `Question ${q.id}`,
        successRate: parseFloat(successRate),
        attempts: questionSubmissions.length,
        difficulty: parseFloat(successRate) >= 80 ? 'Easy' : 
                   parseFloat(successRate) >= 60 ? 'Medium' : 'Hard'
      };
    });
    
    const questionData = questionStats.map((q: any) => [
      q.title,
      `${q.successRate}%`,
      q.attempts.toString(),
      q.difficulty
    ]);
    
    if (questionData.length > 0) {
      autoTable(doc, {
        startY: questionY + 10,
        head: [['Question', 'Success Rate', 'Attempts', 'Difficulty']],
        body: questionData,
        theme: 'grid',
        headStyles: { fillColor: [147, 51, 234], textColor: 255, fontSize: 11 },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 }
        }
      });
    }
    
    // Performance Trends
    const trendsY = startY + (questionData.length > 0 ? 180 : 120);
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Performance Trends', 20, trendsY);
    
    // Calculate trends
    const completedSubmissions = submissions.filter((s: any) => s.status === 'completed');
    const avgScore = reportData.data.averageScore;
    const avgTime = reportData.data.averageTime;
    
    const trends = [
      ['Metric', 'Value', 'Trend'],
      ['Average Score', `${avgScore}%`, avgScore >= 70 ? 'Positive' : 'Needs Improvement'],
      ['Completion Rate', `${reportData.data.completionRate}%`, reportData.data.completionRate >= 80 ? 'Good' : 'Low'],
      ['Accuracy Rate', `${reportData.data.accuracyRate}%`, reportData.data.accuracyRate >= 75 ? 'Good' : 'Needs Work'],
      ['Average Time', avgTime, ''],
      ['Questions per Participant', `${(reportData.data.questionsAnswered / reportData.data.totalParticipants).toFixed(1)}`, ''],
      ['Success Rate', `${reportData.data.accuracyRate}%`, reportData.data.accuracyRate >= 75 ? 'Good' : 'Needs Improvement']
    ];
    
    autoTable(doc, {
      startY: trendsY + 10,
      head: [['Metric', 'Value', 'Trend']],
      body: trends.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [168, 85, 247], textColor: 255, fontSize: 11 },
      styles: { fontSize: 10 },
      columnStyles: {
        2: { cellWidth: 30 }
      }
    });
    
    // Recommendations
    const recommendationsY = startY + (questionData.length > 0 ? 280 : 220);
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Recommendations', 20, recommendationsY);
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const recommendations = [
      `• ${avgScore < 70 ? 'Consider reviewing question difficulty and providing additional study materials' : 'Overall performance is good, consider adding more challenging questions'}`,
      `• ${reportData.data.completionRate < 80 ? 'Investigate reasons for low completion rates and provide better support' : 'High completion rate indicates good contest design'}`,
      `• ${reportData.data.accuracyRate < 75 ? 'Review question clarity and provide more practice opportunities' : 'Good accuracy rate shows effective learning outcomes'}`,
      '• Consider implementing adaptive difficulty based on individual performance',
      '• Provide detailed feedback for incorrect answers to improve learning'
    ];
    
    recommendations.forEach((rec, index) => {
      doc.text(rec, 20, recommendationsY + 20 + (index * 8));
    });
  };

  const generateTimingReport = (doc: jsPDF, reportData: any, contest: any, startY: number) => {
    // Timing Overview
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('Time Analysis', 20, startY);
    
    // Key timing metrics in a highlighted box
    doc.setFillColor(255, 247, 237); // orange-50
    doc.rect(20, startY + 10, 170, 40, 'F');
    doc.setDrawColor(249, 115, 22); // orange-500
    doc.rect(20, startY + 10, 170, 40, 'S');
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Average Time: ${reportData.data.averageTime}`, 25, startY + 25);
    doc.text(`Fastest Time: ${reportData.data.fastestTime}`, 25, startY + 35);
    doc.text(`Slowest Time: ${reportData.data.slowestTime}`, 25, startY + 45);
    
    doc.text(`Total Questions: ${reportData.data.totalQuestions}`, 110, startY + 25);
    doc.text(`Avg Time/Question: ${reportData.data.averageTime}`, 110, startY + 35);
    doc.text(`Completion Rate: ${reportData.data.completionRate}%`, 110, startY + 45);
    
    // Detailed Time Analysis
    const timeY = startY + 70;
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Detailed Time Analysis', 20, timeY);
    
    const submissions = reportData.data.submissions || [];
    const completionTimes = submissions
      .filter((s: any) => s.submittedAt && s.startedAt)
      .map((s: any) => {
        const start = new Date(s.startedAt);
        const end = new Date(s.submittedAt);
        return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
      });
    
    // Calculate time distribution
    const timeDistribution = {
      '0-30 min': completionTimes.filter((t: number) => t <= 30).length,
      '30-60 min': completionTimes.filter((t: number) => t > 30 && t <= 60).length,
      '60-90 min': completionTimes.filter((t: number) => t > 60 && t <= 90).length,
      '90+ min': completionTimes.filter((t: number) => t > 90).length
    };
    
    const totalCompleted = completionTimes.length;
    const timeData = Object.entries(timeDistribution).map(([range, count]) => [
      range,
      count.toString(),
      totalCompleted > 0 ? `${((count / totalCompleted) * 100).toFixed(1)}%` : '0%'
    ]);
    
    const metrics = [
      ['Metric', 'Value', 'Status'],
      ['Average Completion Time', reportData.data.averageTime, ''],
      ['Fastest Completion', reportData.data.fastestTime, 'Excellent'],
      ['Slowest Completion', reportData.data.slowestTime, ''],
      ['Median Time', 'N/A', ''], // Could calculate if needed
      ['Standard Deviation', 'N/A', ''], // Could calculate if needed
      ['Total Completed', totalCompleted.toString(), ''],
      ['Completion Rate', `${reportData.data.completionRate}%`, reportData.data.completionRate >= 80 ? 'Good' : 'Low']
    ];
    
    autoTable(doc, {
      startY: timeY + 10,
      head: [['Metric', 'Value', 'Status']],
      body: metrics.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontSize: 11 },
      styles: { fontSize: 10 },
      columnStyles: {
        2: { cellWidth: 30 }
      }
    });
    
    // Time Distribution Analysis
    const distributionY = startY + 140;
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Time Distribution Analysis', 20, distributionY);
    
    if (timeData.length > 0) {
      autoTable(doc, {
        startY: distributionY + 10,
        head: [['Time Range', 'Count', 'Percentage']],
        body: timeData,
        theme: 'grid',
        headStyles: { fillColor: [251, 146, 60], textColor: 255, fontSize: 11 },
        styles: { fontSize: 10 }
      });
    }
    
    // Performance vs Time Analysis
    const performanceY = startY + (timeData.length > 0 ? 200 : 160);
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Performance vs Time Analysis', 20, performanceY);
    
    // Calculate correlation between time and performance
    const timeScoreData = submissions
      .filter((s: any) => s.submittedAt && s.startedAt && s.score !== undefined)
      .map((s: any) => {
        const start = new Date(s.startedAt);
        const end = new Date(s.submittedAt);
        const time = (end.getTime() - start.getTime()) / (1000 * 60);
        return { time, score: s.score || 0 };
      });
    
    if (timeScoreData.length > 0) {
      const avgScoreFast = timeScoreData.filter((d: any) => d.time <= 30).reduce((sum: number, d: any) => sum + d.score, 0) / 
                          Math.max(timeScoreData.filter((d: any) => d.time <= 30).length, 1);
      const avgScoreSlow = timeScoreData.filter((d: any) => d.time > 60).reduce((sum: number, d: any) => sum + d.score, 0) / 
                          Math.max(timeScoreData.filter((d: any) => d.time > 60).length, 1);
      
      const performanceData = [
        ['Time Category', 'Average Score', 'Participants'],
        ['Fast (≤30 min)', `${avgScoreFast.toFixed(1)}%`, timeScoreData.filter((d: any) => d.time <= 30).length.toString()],
        ['Medium (30-60 min)', 'N/A', timeScoreData.filter((d: any) => d.time > 30 && d.time <= 60).length.toString()],
        ['Slow (>60 min)', `${avgScoreSlow.toFixed(1)}%`, timeScoreData.filter((d: any) => d.time > 60).length.toString()]
      ];
      
      autoTable(doc, {
        startY: performanceY + 10,
        head: [['Time Category', 'Average Score', 'Participants']],
        body: performanceData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [245, 101, 101], textColor: 255, fontSize: 11 },
        styles: { fontSize: 10 }
      });
    }
  };

  const generateSummaryReport = (doc: jsPDF, reportData: any, contest: any, startY: number) => {
    // Executive Summary
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('Executive Summary', 20, startY);
    
    // Key metrics in a highlighted box
    doc.setFillColor(254, 242, 242); // red-50
    doc.rect(20, startY + 10, 170, 50, 'F');
    doc.setDrawColor(239, 68, 68); // red-500
    doc.rect(20, startY + 10, 170, 50, 'S');
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Contest: ${contest?.title || 'Unknown'}`, 25, startY + 25);
    doc.text(`Total Participants: ${reportData.data.totalParticipants}`, 25, startY + 35);
    doc.text(`Average Score: ${reportData.data.averageScore}%`, 25, startY + 45);
    doc.text(`Completion Rate: ${reportData.data.completionRate}%`, 25, startY + 55);
    
    doc.text(`Duration: ${contest?.startTime && contest?.endTime ? 
      Math.ceil((new Date(contest.endTime).getTime() - new Date(contest.startTime).getTime()) / (1000 * 60 * 60 * 24)) + ' days' : 'N/A'}`, 110, startY + 25);
    doc.text(`Average Time: ${reportData.data.averageTime}`, 110, startY + 35);
    doc.text(`Success Rate: ${reportData.data.accuracyRate}%`, 110, startY + 45);
    doc.text(`Total Questions: ${reportData.data.totalQuestions}`, 110, startY + 55);
    
    // Key Performance Indicators
    const kpiY = startY + 80;
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Key Performance Indicators', 20, kpiY);
    
    const keyMetrics = [
      ['Metric', 'Value', 'Status', 'Target'],
      ['Total Participants', reportData.data.totalParticipants.toString(), 'Actual', 'N/A'],
      ['Average Score', `${reportData.data.averageScore}%`, reportData.data.averageScore >= 70 ? 'Good' : 'Needs Improvement', '≥70%'],
      ['Completion Rate', `${reportData.data.completionRate}%`, reportData.data.completionRate >= 80 ? 'Good' : 'Low', '≥80%'],
      ['Success Rate', `${reportData.data.accuracyRate}%`, reportData.data.accuracyRate >= 75 ? 'Good' : 'Needs Work', '≥75%'],
      ['Average Time', reportData.data.averageTime, 'Actual', 'N/A'],
      ['Top Score', `${reportData.data.topScore}%`, 'Excellent', 'N/A'],
      ['Questions Answered', reportData.data.questionsAnswered.toString(), 'Actual', 'N/A'],
      ['Correct Answers', reportData.data.correctAnswers.toString(), 'Actual', 'N/A']
    ];
    
    autoTable(doc, {
      startY: kpiY + 10,
      head: [['Metric', 'Value', 'Status', 'Target']],
      body: keyMetrics.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontSize: 11 },
      styles: { fontSize: 10 },
      columnStyles: {
        2: { cellWidth: 25 },
        3: { cellWidth: 20 }
      }
    });
    
    // Performance Analysis
    const analysisY = startY + 160;
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Performance Analysis', 20, analysisY);
    
    const analysis = [
      ['Aspect', 'Current Performance', 'Recommendation'],
      ['Overall Score', `${reportData.data.averageScore}%`, reportData.data.averageScore >= 70 ? 'Maintain current standards' : 'Review question difficulty and provide additional support'],
      ['Participation', `${reportData.data.completionRate}%`, reportData.data.completionRate >= 80 ? 'Good engagement levels' : 'Investigate barriers to completion'],
      ['Accuracy', `${reportData.data.accuracyRate}%`, reportData.data.accuracyRate >= 75 ? 'Good understanding demonstrated' : 'Provide more practice opportunities'],
      ['Time Management', reportData.data.averageTime, 'Review time allocation for questions'],
      ['Question Coverage', `${reportData.data.questionsAnswered} questions`, 'Ensure all topics are adequately covered']
    ];
    
    autoTable(doc, {
      startY: analysisY + 10,
      head: [['Aspect', 'Current Performance', 'Recommendation']],
      body: analysis.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 127], textColor: 255, fontSize: 11 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 60 }
      }
    });
    
    // Strategic Recommendations
    const recommendationsY = startY + 240;
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Strategic Recommendations', 20, recommendationsY);
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const recommendations = [
      `• ${reportData.data.averageScore < 70 ? 'Review question difficulty and provide additional study materials' : 'Overall performance is good, consider adding more challenging questions'}`,
      `• ${reportData.data.completionRate < 80 ? 'Investigate reasons for low completion rates and provide better support' : 'High completion rate indicates good contest design'}`,
      `• ${reportData.data.accuracyRate < 75 ? 'Review question clarity and provide more practice opportunities' : 'Good accuracy rate shows effective learning outcomes'}`,
      '• Consider implementing adaptive difficulty based on individual performance',
      '• Provide detailed feedback for incorrect answers to improve learning',
      '• Analyze question-by-question performance to identify problematic areas',
      '• Consider time-based analysis to optimize question timing',
      '• Implement regular performance reviews and continuous improvement processes'
    ];
    
    recommendations.forEach((rec, index) => {
      doc.text(rec, 20, recommendationsY + 20 + (index * 8));
    });
    
    // Next Steps
    const nextStepsY = startY + 320;
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Next Steps', 20, nextStepsY);
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const nextSteps = [
      '1. Review detailed analytics for specific improvement areas',
      '2. Implement recommended changes for next contest iteration',
      '3. Monitor performance improvements over time',
      '4. Gather participant feedback for qualitative insights',
      '5. Schedule follow-up analysis after implementing changes'
    ];
    
    nextSteps.forEach((step, index) => {
      doc.text(step, 20, nextStepsY + 20 + (index * 8));
    });
  };

  const generateGeneralReport = (doc: jsPDF, reportData: any, contest: any, startY: number) => {
    // General Overview
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('General Contest Report', 20, startY);
    
    // Contest overview in a highlighted box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(20, startY + 10, 170, 40, 'F');
    doc.setDrawColor(75, 85, 99); // slate-500
    doc.rect(20, startY + 10, 170, 40, 'S');
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Contest: ${contest?.title || 'Unknown'}`, 25, startY + 25);
    doc.text(`Total Participants: ${reportData.data.totalParticipants}`, 25, startY + 35);
    doc.text(`Average Score: ${reportData.data.averageScore}%`, 25, startY + 45);
    
    doc.text(`Completion Rate: ${reportData.data.completionRate}%`, 110, startY + 25);
    doc.text(`Success Rate: ${reportData.data.accuracyRate}%`, 110, startY + 35);
    doc.text(`Average Time: ${reportData.data.averageTime}`, 110, startY + 45);
    
    // Comprehensive Metrics
    const metricsY = startY + 70;
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Comprehensive Metrics', 20, metricsY);
    
    const metrics = [
      ['Metric', 'Value', 'Status'],
      ['Total Participants', reportData.data.totalParticipants.toString(), ''],
      ['Completed Participants', reportData.data.completedParticipants.toString(), ''],
      ['Average Score', `${reportData.data.averageScore}%`, reportData.data.averageScore >= 70 ? 'Good' : 'Needs Improvement'],
      ['Top Score', `${reportData.data.topScore}%`, 'Excellent'],
      ['Completion Rate', `${reportData.data.completionRate}%`, reportData.data.completionRate >= 80 ? 'Good' : 'Low'],
      ['Success Rate', `${reportData.data.accuracyRate}%`, reportData.data.accuracyRate >= 75 ? 'Good' : 'Needs Work'],
      ['Average Time', reportData.data.averageTime, ''],
      ['Fastest Time', reportData.data.fastestTime, ''],
      ['Slowest Time', reportData.data.slowestTime, ''],
      ['Total Questions', reportData.data.totalQuestions.toString(), ''],
      ['Questions Answered', reportData.data.questionsAnswered.toString(), ''],
      ['Correct Answers', reportData.data.correctAnswers.toString(), '']
    ];
    
    autoTable(doc, {
      startY: metricsY + 10,
      head: [['Metric', 'Value', 'Status']],
      body: metrics.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [75, 85, 99], textColor: 255, fontSize: 11 },
      styles: { fontSize: 10 },
      columnStyles: {
        2: { cellWidth: 30 }
      }
    });
    
    // Contest Information
    const infoY = startY + 140;
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Contest Information', 20, infoY);
    
    const contestInfo = [
      ['Property', 'Value'],
      ['Contest Title', contest?.title || 'Unknown'],
      ['Start Date', contest?.startTime ? new Date(contest.startTime).toLocaleDateString() : 'N/A'],
      ['End Date', contest?.endTime ? new Date(contest.endTime).toLocaleDateString() : 'N/A'],
      ['Duration', contest?.startTime && contest?.endTime ? 
        Math.ceil((new Date(contest.endTime).getTime() - new Date(contest.startTime).getTime()) / (1000 * 60 * 60 * 24)) + ' days' : 'N/A'],
      ['Status', contest?.isActive ? 'Active' : 'Inactive'],
      ['Report Generated', new Date().toLocaleString()],
      ['Report ID', Date.now().toString()]
    ];
    
    autoTable(doc, {
      startY: infoY + 10,
      head: [['Property', 'Value']],
      body: contestInfo.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [100, 116, 139], textColor: 255, fontSize: 11 },
      styles: { fontSize: 10 }
    });
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

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
                                 <h1 className="text-3xl font-bold text-slate-900">Export Reports</h1>
                 <p className="text-slate-600">Generate professional PDF reports with detailed analytics and performance data</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => window.location.href = "/admin"}
                data-testid="button-back-dashboard"
              >
                Back to Dashboard
              </Button>
              {user && <ProfileDialog user={user} />}
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
        {/* Report Generation Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Generate Report</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Contest
                </label>
                <Select value={selectedContest} onValueChange={setSelectedContest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a contest" />
                  </SelectTrigger>
                  <SelectContent>
                    {contests?.map((contest) => (
                      <SelectItem key={contest.id} value={contest.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{contest.title}</span>
                          <Badge variant={contest.isActive ? "default" : "secondary"} className="ml-2">
                            {contest.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Report Type
                </label>
                <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose report type" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((reportType) => (
                      <SelectItem key={reportType.id} value={reportType.id}>
                        {reportType.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button
              onClick={generateReport}
              disabled={!selectedContest || !selectedReportType || isGenerating}
              className="w-full md:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Report...
                </>
                             ) : (
                 <>
                   <Download className="w-4 h-4 mr-2" />
                   Generate & Download PDF Report
                 </>
               )}
            </Button>
          </CardContent>
        </Card>

        {/* Report Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTypes.map((reportType, index) => (
            <motion.div
              key={reportType.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 cursor-pointer"
                    onClick={() => setSelectedReportType(reportType.id)}>
                <CardContent className="p-6">
                  <div className={`bg-gradient-to-br ${reportType.color} rounded-lg p-4 text-white mb-4`}>
                    {reportType.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{reportType.title}</h3>
                  <p className="text-slate-600 text-sm">{reportType.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
