import { Calendar, BookOpen, ChartBar as BarChart3, GraduationCap, Loader as Loader2 } from "lucide-react";
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
      <div className="h-full w-full flex flex-col">
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="border-b bg-muted/30 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary flex-shrink-0">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold leading-none whitespace-nowrap">Study Hub</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Your Learning Space</span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-2 py-3 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            <div className="px-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
                Overview
              </div>
            </div>

            <Tabs defaultValue="overview" className="w-full px-2">
              <TabsList className="grid w-full grid-cols-3 h-9 bg-muted/50">
                <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-background">
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                  <span>Stats</span>
                </TabsTrigger>
                <TabsTrigger value="schedule" className="text-xs data-[state=active]:bg-background">
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  <span>Today</span>
                </TabsTrigger>
                <TabsTrigger value="assignments" className="text-xs data-[state=active]:bg-background">
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  <span>Tasks</span>
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
      </div>
    </div>
  );
}
