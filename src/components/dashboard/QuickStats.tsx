import { Clock, BookOpen, CheckCircle2, AlertCircle } from "lucide-react";

interface StatsData {
  todayClasses: number;
  pendingAssignments: number;
  completedTasks: number;
  upcomingExams: number;
}

export default function QuickStats({ stats }: { stats: StatsData }) {
  const statItems = [
    {
      icon: Clock,
      label: "Today's Classes",
      value: stats.todayClasses,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: BookOpen,
      label: "Pending Tasks",
      value: stats.pendingAssignments,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      icon: CheckCircle2,
      label: "Completed",
      value: stats.completedTasks,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      icon: AlertCircle,
      label: "Upcoming Exams",
      value: stats.upcomingExams,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="responsive-grid-sm mb-6">
      {statItems.map((item, index) => (
        <div key={index} className="brutal-card p-4 min-h-[100px] flex items-center">
          <div className="flex items-center gap-3 w-full">
            <div className={`p-2 rounded-lg ${item.bgColor} flex-shrink-0`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xl sm:text-2xl font-bold text-foreground truncate">{item.value}</div>
              <div className="text-xs sm:text-sm text-muted-foreground truncate">{item.label}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}