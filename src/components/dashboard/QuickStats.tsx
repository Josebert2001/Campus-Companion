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
    <div className="grid grid-cols-1 gap-2">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm hover:bg-accent/50 transition-colors"
        >
          <div className={`flex h-9 w-9 items-center justify-center rounded-md ${item.bgColor} flex-shrink-0`}>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold leading-none text-foreground">{item.value}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}