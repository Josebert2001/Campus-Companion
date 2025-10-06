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
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <main className="w-full min-h-screen flex flex-col bg-gradient-to-br from-background via-accent/20 to-secondary/10">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b shadow-sm">
          <div className="flex items-center gap-3 px-3 sm:px-4 md:px-6 py-3">
            <SidebarTrigger className="h-9 w-9" />
            <div className="flex-1 min-w-0">
              <DashboardHeader
                studentName={user?.user_metadata?.full_name || user?.email || "Student"}
                upcomingCount={statsLoading ? 0 : (stats.pendingAssignments + stats.upcomingExams)}
                onSignOut={onSignOut}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 w-full overflow-hidden">
          <div className="h-full w-full">
            <AIStudyCompanion />
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}