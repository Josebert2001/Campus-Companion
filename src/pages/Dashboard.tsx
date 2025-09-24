import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, BookOpen, MessageSquare, BarChart3, Loader2 } from 'lucide-react';
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import QuickStats from "@/components/dashboard/QuickStats";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import AIStudyCompanion from "@/components/dashboard/AIStudyCompanion";
import AssignmentTracker from "@/components/assignments/AssignmentTracker";
import { useStats } from "@/hooks/useStats";
import { useTodaySchedule } from "@/hooks/useTodaySchedule";

interface DashboardProps {
  user: any;
  onSignOut: () => void;
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Fetch real data from database
  const { stats, loading: statsLoading, error: statsError } = useStats();
  const { schedule, loading: scheduleLoading, error: scheduleError } = useTodaySchedule();

  // Show loading state if either data is still loading
  if (statsLoading || scheduleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/10 flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/10">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <DashboardHeader 
          studentName={user?.user_metadata?.full_name || user?.email || "Student"}
          upcomingCount={stats.pendingAssignments + stats.upcomingExams}
          onSignOut={onSignOut}
        />

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-panel p-1">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="ai-companion" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              AI Companion
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {statsError && (
              <div className="glass-card p-4 border-destructive/20 bg-destructive/5">
                <p className="text-destructive text-sm">Error loading stats: {statsError}</p>
              </div>
            )}
            <QuickStats stats={stats} />
            
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {scheduleError && (
                  <div className="glass-card p-4 border-destructive/20 bg-destructive/5 mb-4">
                    <p className="text-destructive text-sm">Error loading schedule: {scheduleError}</p>
                  </div>
                )}
                <TodaySchedule schedule={schedule} />
              </div>
              <div>
                <AIStudyCompanion />
              </div>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            {scheduleError && (
              <div className="glass-card p-4 border-destructive/20 bg-destructive/5">
                <p className="text-destructive text-sm">Error loading schedule: {scheduleError}</p>
              </div>
            )}
            <TodaySchedule schedule={schedule} />
            {/* Add weekly/monthly calendar view here later */}
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-6">
            <AssignmentTracker />
          </TabsContent>

          {/* AI Companion Tab */}
          <TabsContent value="ai-companion" className="space-y-6">
            <div className="max-w-4xl mx-auto">
              <AIStudyCompanion />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}