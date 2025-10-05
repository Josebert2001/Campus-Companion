import { Calendar, BookOpen, BarChart3, GraduationCap, Loader2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import QuickStats from "./QuickStats";
import TodaySchedule from "./TodaySchedule";
import AssignmentTracker from "@/components/assignments/AssignmentTracker";
import { useStats } from "@/hooks/useStats";
import { useTodaySchedule } from "@/hooks/useTodaySchedule";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AppSidebar() {
  const { stats, loading: statsLoading } = useStats();
  const { schedule, loading: scheduleLoading } = useTodaySchedule();

  if (statsLoading || scheduleLoading) {
    return (
      <Sidebar collapsible="offcanvas" className="border-r">
        <SidebarContent>
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="offcanvas" className="border-r">
      <SidebarHeader className="border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=offcanvas]:group-data-[state=collapsed]:hidden">
            <span className="text-sm font-semibold leading-none">Study Hub</span>
            <span className="text-xs text-muted-foreground">Your Learning Space</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            <SidebarGroup className="px-2">
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
                Overview
              </SidebarGroupLabel>
            </SidebarGroup>

            <Tabs defaultValue="overview" className="w-full px-2">
              <TabsList className="grid w-full grid-cols-3 h-9 bg-muted/50">
                <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-background">
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                  <span className="group-data-[collapsible=offcanvas]:group-data-[state=collapsed]:hidden">Stats</span>
                </TabsTrigger>
                <TabsTrigger value="schedule" className="text-xs data-[state=active]:bg-background">
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  <span className="group-data-[collapsible=offcanvas]:group-data-[state=collapsed]:hidden">Today</span>
                </TabsTrigger>
                <TabsTrigger value="assignments" className="text-xs data-[state=active]:bg-background">
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  <span className="group-data-[collapsible=offcanvas]:group-data-[state=collapsed]:hidden">Tasks</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3 mt-3">
                <QuickStats stats={stats} />
              </TabsContent>

              <TabsContent value="schedule" className="mt-3">
                <TodaySchedule schedule={schedule} />
              </TabsContent>

              <TabsContent value="assignments" className="mt-3">
                <AssignmentTracker />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
