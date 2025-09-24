import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ScheduleItem {
  id: string;
  course: string;
  time: string;
  location: string;
  type: 'lecture' | 'tutorial' | 'lab' | 'exam';
  instructor?: string;
}

export function useTodaySchedule() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchTodaySchedule = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current day of week (0 = Sunday, 1 = Monday, etc.)
        const today = new Date().getDay();

        const { data: schedules, error: schedulesError } = await supabase
          .from('schedules')
          .select('*')
          .eq('user_id', user.id)
          .eq('day_of_week', today)
          .order('start_time', { ascending: true });

        if (schedulesError) throw schedulesError;

        // Transform the data to match the expected format
        const transformedSchedule: ScheduleItem[] = schedules?.map(schedule => ({
          id: schedule.id,
          course: schedule.course_name,
          time: `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`,
          location: schedule.location || 'TBA',
          type: schedule.type as 'lecture' | 'tutorial' | 'lab' | 'exam',
          instructor: schedule.instructor,
        })) || [];

        setSchedule(transformedSchedule);
      } catch (err) {
        console.error('Error fetching today\'s schedule:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch schedule');
      } finally {
        setLoading(false);
      }
    };

    fetchTodaySchedule();
  }, [user]);

  return { schedule, loading, error };
}

// Helper function to format time from HH:MM:SS to HH:MM
function formatTime(timeString: string): string {
  if (!timeString) return '';
  return timeString.substring(0, 5);
}