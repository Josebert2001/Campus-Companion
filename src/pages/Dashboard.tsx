import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import AIStudyCompanion from "@/components/dashboard/AIStudyCompanion";
import { useStats } from "@/hooks/useStats";

interface DashboardProps {
  user: any;
  onSignOut: () => void;
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const { stats, loading: statsLoading } = useStats();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex bg-gradient-to-br from-background via-accent/20 to-secondary/10">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col w-full">
          {/* Header with Sidebar Trigger */}
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
            <div className="flex items-center gap-4 p-4">
              <SidebarTrigger className="lg:hidden" />
              <DashboardHeader 
                studentName={user?.user_metadata?.full_name || user?.email || "Student"}
                upcomingCount={statsLoading ? 0 : (stats.pendingAssignments + stats.upcomingExams)}
                onSignOut={onSignOut}
              />
            </div>
          </header>

          {/* Main Chat Content */}
          <main className="flex-1 w-full">
            <div className="h-full w-full">
              <AIStudyCompanion />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}