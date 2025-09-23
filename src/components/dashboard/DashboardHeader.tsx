import { CalendarDays, User, Bell, BookOpen, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  studentName: string;
  upcomingCount: number;
  onSignOut?: () => void;
}

export default function DashboardHeader({ studentName, upcomingCount, onSignOut }: DashboardHeaderProps) {
  return (
    <header className="glass-card p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="neuro-btn p-3">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Campus Companion</h1>
            <p className="text-muted-foreground">Welcome back, {studentName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {upcomingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {upcomingCount}
              </span>
            )}
          </Button>
          
          <Button variant="outline" size="icon">
            <User className="w-5 h-5" />
          </Button>

          {onSignOut && (
            <Button variant="outline" size="sm" onClick={onSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          )}
        </div>
      </div>
      
      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="w-4 h-4" />
        <span>{new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</span>
      </div>
    </header>
  );
}