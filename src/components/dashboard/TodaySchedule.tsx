import { Clock, MapPin, Users, MoveVertical as MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleItem {
  id: string;
  course: string;
  time: string;
  location: string;
  type: 'lecture' | 'tutorial' | 'lab' | 'exam';
  instructor?: string;
}

interface TodayScheduleProps {
  schedule: ScheduleItem[];
}

export default function TodaySchedule({ schedule }: TodayScheduleProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lecture': return 'bg-primary text-primary-foreground';
      case 'tutorial': return 'bg-secondary text-secondary-foreground';
      case 'lab': return 'bg-purple-500 text-white';
      case 'exam': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {schedule.length === 0 ? (
          <div className="rounded-lg border bg-card p-4 text-center">
            <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No classes today</p>
          </div>
        ) : (
          schedule.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border bg-card p-3 shadow-sm hover:bg-accent/50 transition-colors space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${getTypeColor(item.type)}`}>
                      {item.type}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground truncate">{item.course}</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{item.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{item.location}</span>
                </div>
                {item.instructor && (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{item.instructor}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}