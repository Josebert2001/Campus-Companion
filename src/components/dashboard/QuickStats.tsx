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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statItems.map((item, index) => (
        <div key={index} className="brutal-card p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${item.bgColor}`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{item.value}</div>
              <div className="text-sm text-muted-foreground">{item.label}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}