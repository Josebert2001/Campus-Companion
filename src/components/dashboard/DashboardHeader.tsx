import { CalendarDays, User, Bell, BookOpen, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  studentName: string;
  upcomingCount: number;
  onSignOut?: () => void;
}

export default function DashboardHeader({ studentName, upcomingCount, onSignOut }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-1 w-full">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="neuro-btn p-2">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1 hidden sm:block">
          <h1 className="text-lg font-bold text-foreground truncate">Campus Companion</h1>
          <p className="text-xs text-muted-foreground truncate">Welcome, {studentName}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          {upcomingCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {upcomingCount}
            </span>
          )}
        </Button>
        
        <Button variant="ghost" size="icon">
          <User className="w-4 h-4" />
        </Button>

        {onSignOut && (
          <>
            <Button variant="ghost" size="sm" onClick={onSignOut} className="hidden md:inline-flex">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
            <Button variant="ghost" size="icon" onClick={onSignOut} className="md:hidden">
              <LogOut className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}