import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface StatsData {
  todayClasses: number;
  pendingAssignments: number;
  completedTasks: number;
  upcomingExams: number;
}

export function useStats() {
  const [stats, setStats] = useState<StatsData>({
    todayClasses: 0,
    pendingAssignments: 0,
    completedTasks: 0,
    upcomingExams: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current day of week (0 = Sunday, 1 = Monday, etc.)
        const today = new Date().getDay();

        // Fetch today's classes from schedules
        const { data: todaySchedules, error: schedulesError } = await supabase
          .from('schedules')
          .select('*')
          .eq('user_id', user.id)
          .eq('day_of_week', today);

        if (schedulesError) throw schedulesError;

        // Fetch assignments statistics
        const { data: allAssignments, error: assignmentsError } = await supabase
          .from('assignments')
          .select('status, type, due_date')
          .eq('user_id', user.id);

        if (assignmentsError) throw assignmentsError;

        // Calculate stats
        const pendingAssignments = allAssignments?.filter(a => a.status === 'pending').length || 0;
        const completedTasks = allAssignments?.filter(a => a.status === 'completed').length || 0;
        
        // Count upcoming exams (exams due in the future)
        const currentDate = new Date().toISOString().split('T')[0];
        const upcomingExams = allAssignments?.filter(a => 
          a.type === 'exam' && a.due_date >= currentDate
        ).length || 0;

        setStats({
          todayClasses: todaySchedules?.length || 0,
          pendingAssignments,
          completedTasks,
          upcomingExams,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return { stats, loading, error };
}