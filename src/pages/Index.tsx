import DashboardHeader from "@/components/dashboard/DashboardHeader";
import QuickStats from "@/components/dashboard/QuickStats";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import AIStudyCompanion from "@/components/dashboard/AIStudyCompanion";

const Index = () => {
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
        {/* Header */}
        <DashboardHeader 
          studentName={studentData.name}
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
