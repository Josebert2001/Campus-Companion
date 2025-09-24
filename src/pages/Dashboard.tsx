import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, BookOpen, MessageSquare, BarChart3, Loader2, Menu } from 'lucide-react';
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import QuickStats from "@/components/dashboard/QuickStats";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import AIStudyCompanion from "@/components/dashboard/AIStudyCompanion";
import AssignmentTracker from "@/components/assignments/AssignmentTracker";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useStats } from "@/hooks/useStats";
import { useTodaySchedule } from "@/hooks/useTodaySchedule";

interface DashboardProps {
  user: any;
  onSignOut: () => void;
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Fetch real data from database
  const { stats, loading: statsLoading, error: statsError } = useStats();
  const { schedule, loading: scheduleLoading, error: scheduleError } = useTodaySchedule();

  // Show loading state if either data is still loading
  if (statsLoading || scheduleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/10 flex items-center justify-center p-4">
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground mobile-text">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/10 pb-safe">
      <div className="max-w-7xl mx-auto mobile-padding py-4 md:py-6">
        {/* Header */}
        <DashboardHeader 
          studentName={user?.user_metadata?.full_name || user?.email || "Student"}
          upcomingCount={stats.pendingAssignments + stats.upcomingExams}
          onSignOut={onSignOut}
        />

        {/* Mobile Navigation */}
        <div className="md:hidden mb-6">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Menu className="w-4 h-4 mr-2" />
                Navigation
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <div className="space-y-4 mt-6">
                {[
                  { value: 'overview', icon: BarChart3, label: 'Overview' },
                  { value: 'schedule', icon: Calendar, label: 'Schedule' },
                  { value: 'assignments', icon: BookOpen, label: 'Assignments' },
                  { value: 'ai-companion', icon: MessageSquare, label: 'AI Companion' },
                ].map((tab) => (
                  <Button
                    key={tab.value}
                    variant={activeTab === tab.value ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setActiveTab(tab.value);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-panel p-1 hidden md:inline-flex">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Assignments</span>
            </TabsTrigger>
            <TabsTrigger value="ai-companion" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">AI Companion</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {statsError && (
              <div className="glass-card p-4 border-destructive/20 bg-destructive/5 rounded-lg">
                <p className="text-destructive text-sm">Error loading stats: {statsError}</p>
              </div>
            )}
            <QuickStats stats={stats} />
            
            <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="lg:col-span-2 order-2 lg:order-1">
                {scheduleError && (
                  <div className="glass-card p-4 border-destructive/20 bg-destructive/5 mb-4 rounded-lg">
                    <p className="text-destructive text-sm">Error loading schedule: {scheduleError}</p>
                  </div>
                )}
                <TodaySchedule schedule={schedule} />
              </div>
              <div className="order-1 lg:order-2">
                <AIStudyCompanion />
              </div>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            {scheduleError && (
              <div className="glass-card p-4 border-destructive/20 bg-destructive/5 rounded-lg">
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
            <div className="max-w-4xl mx-auto w-full">
              <AIStudyCompanion />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}