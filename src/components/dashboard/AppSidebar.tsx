import { Calendar, BookOpen, BarChart3, Home } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import QuickStats from "./QuickStats";
import TodaySchedule from "./TodaySchedule";
import AssignmentTracker from "@/components/assignments/AssignmentTracker";
import { useStats } from "@/hooks/useStats";
import { useTodaySchedule } from "@/hooks/useTodaySchedule";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AppSidebar() {
  const { stats, loading: statsLoading } = useStats();
  const { schedule, loading: scheduleLoading } = useTodaySchedule();

  if (statsLoading || scheduleLoading) {
    return (
      <Sidebar collapsible="icon">
        <SidebarContent>
          <div className="p-4 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 space-y-6">
          <SidebarGroup>
            <SidebarGroupLabel className="text-base font-semibold mb-3">
              <Home className="w-4 h-4 inline mr-2" />
              Dashboard
            </SidebarGroupLabel>
          </SidebarGroup>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 glass-panel p-1">
              <TabsTrigger value="overview" className="text-xs">
                <BarChart3 className="w-3 h-3 mr-1" />
                Stats
              </TabsTrigger>
              <TabsTrigger value="schedule" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="assignments" className="text-xs">
                <BookOpen className="w-3 h-3 mr-1" />
                Tasks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <QuickStats stats={stats} />
            </TabsContent>

            <TabsContent value="schedule" className="mt-4">
              <TodaySchedule schedule={schedule} />
            </TabsContent>

            <TabsContent value="assignments" className="mt-4">
              <AssignmentTracker />
            </TabsContent>
          </Tabs>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
