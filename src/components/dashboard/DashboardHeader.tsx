import { CalendarDays, User, Bell, BookOpen, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  studentName: string;
  upcomingCount: number;
  onSignOut?: () => void;
}

export default function DashboardHeader({ studentName, upcomingCount, onSignOut }: DashboardHeaderProps) {
  return (
    <header className="glass-card p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div className="neuro-btn p-3">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">Campus Companion</h1>
            <p className="text-sm sm:text-base text-muted-foreground truncate">Welcome back, {studentName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <Button variant="outline" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {upcomingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold">
                {upcomingCount}
              </span>
            )}
          </Button>
          
          <Button variant="outline" size="icon">
            <User className="w-5 h-5" />
          </Button>

          {onSignOut && (
            <Button variant="outline" size="sm" onClick={onSignOut} className="hidden sm:inline-flex">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
            <Button variant="outline" size="icon" onClick={onSignOut} className="sm:hidden">
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="mt-3 sm:mt-4 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <CalendarDays className="w-4 h-4" />
        <span className="truncate">{new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</span>
      </div>
    </header>
  );
}