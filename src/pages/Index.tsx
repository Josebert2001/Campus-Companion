import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import QuickStats from "@/components/dashboard/QuickStats";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import AIStudyCompanion from "@/components/dashboard/AIStudyCompanion";
import { LogOut } from 'lucide-react';

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/10 flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-48"></div>
            <div className="h-4 bg-muted rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }
  // Mock data for demonstration
  const studentData = {
    name: "Alex Johnson",
    upcomingCount: 3,
  };

  const statsData = {
    todayClasses: 4,
    pendingAssignments: 7,
    completedTasks: 12,
    upcomingExams: 2,
  };

  const scheduleData = [
    {
      id: "1",
      course: "Advanced Mathematics",
      time: "09:00 - 10:30",
      location: "Room 204",
      type: "lecture" as const,
      instructor: "Dr. Smith",
    },
    {
      id: "2", 
      course: "Computer Science Lab",
      time: "14:00 - 16:00",
      location: "Lab B12",
      type: "lab" as const,
      instructor: "Prof. Williams",
    },
    {
      id: "3",
      course: "Physics Tutorial",
      time: "16:30 - 17:30",
      location: "Room 105",
      type: "tutorial" as const,
      instructor: "Dr. Brown",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/10 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* User Actions */}
        <div className="flex justify-end mb-6">
          <Button 
            onClick={signOut}
            variant="outline"
            size="sm"
            className="glass-panel"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Header */}
        <DashboardHeader 
          studentName={user?.user_metadata?.full_name || user?.email || "Student"}
          upcomingCount={studentData.upcomingCount}
        />

        {/* Quick Stats */}
        <QuickStats stats={statsData} />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <div className="lg:col-span-2">
            <TodaySchedule schedule={scheduleData} />
          </div>

          {/* AI Study Companion */}
          <div>
            <AIStudyCompanion />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
