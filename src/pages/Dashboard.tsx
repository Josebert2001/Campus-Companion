import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, BookOpen, MessageSquare, BarChart3 } from 'lucide-react';
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import QuickStats from "@/components/dashboard/QuickStats";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import AIStudyCompanion from "@/components/dashboard/AIStudyCompanion";
import AssignmentTracker from "@/components/assignments/AssignmentTracker";

interface DashboardProps {
  user: any;
  onSignOut: () => void;
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for demonstration
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
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/10">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <DashboardHeader 
          studentName={user?.user_metadata?.full_name || user?.email || "Student"}
          upcomingCount={3}
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
            <QuickStats stats={statsData} />
            
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TodaySchedule schedule={scheduleData} />
              </div>
              <div>
                <AIStudyCompanion />
              </div>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <TodaySchedule schedule={scheduleData} />
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