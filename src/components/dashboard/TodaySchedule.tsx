import { Clock, MapPin, Users, MoreVertical } from "lucide-react";
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="mobile-heading font-bold text-foreground">Today's Schedule</h2>
        <Button variant="outline" size="sm" className="hidden sm:inline-flex">
          View All
        </Button>
      </div>
      
      <div className="space-y-3">
        {schedule.length === 0 ? (
          <div className="glass-panel p-4 sm:p-6 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground mobile-text">No classes scheduled for today</p>
          </div>
        ) : (
          schedule.map((item) => (
            <div key={item.id} className="schedule-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${getTypeColor(item.type)}`}>
                      {item.type}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mobile-text truncate">{item.course}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span className="truncate">{item.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{item.location}</span>
                      </div>
                      {item.instructor && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span className="truncate">{item.instructor}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}