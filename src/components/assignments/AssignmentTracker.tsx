import { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, AlertTriangle, CheckCircle2, Edit, Trash2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Assignment {
  id: string;
  title: string;
  course: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  type: 'assignment' | 'exam' | 'project';
}

export default function AssignmentTracker() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    course: string;
    description: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
    type: 'assignment' | 'exam' | 'project';
  }>({
    title: '',
    course: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    type: 'assignment'
  });

  const { toast } = useToast();

  // Fetch assignments from Supabase
  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', user?.id)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Map database fields to component interface
      const mappedAssignments = data.map(assignment => ({
        id: assignment.id,
        title: assignment.title,
        course: assignment.course,
        description: assignment.description || '',
        dueDate: assignment.due_date,
        priority: assignment.priority as 'low' | 'medium' | 'high',
        status: assignment.status as 'pending' | 'in-progress' | 'completed',
        type: assignment.type as 'assignment' | 'exam' | 'project'
      }));

      setAssignments(mappedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({ title: "Failed to load assignments", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      if (editingAssignment) {
        // Update existing assignment
        const { error } = await supabase
          .from('assignments')
          .update({
            title: formData.title,
            course: formData.course,
            description: formData.description,
            due_date: formData.dueDate,
            priority: formData.priority,
            type: formData.type
          })
          .eq('id', editingAssignment.id)
          .eq('user_id', user.id);

        if (error) throw error;
        toast({ title: "Assignment updated successfully!" });
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('assignments')
          .insert({
            title: formData.title,
            course: formData.course,
            description: formData.description,
            due_date: formData.dueDate,
            priority: formData.priority,
            type: formData.type,
            status: 'pending',
            user_id: user.id
          });

        if (error) throw error;
        toast({ title: "Assignment added successfully!" });
      }

      // Refresh the assignments list
      await fetchAssignments();
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast({ title: "Failed to save assignment", variant: "destructive" });
      return;
    }

    // Reset form
    setFormData({
      title: '',
      course: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      type: 'assignment'
    });
    setEditingAssignment(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      course: assignment.course,
      description: assignment.description,
      dueDate: assignment.dueDate,
      priority: assignment.priority,
      type: assignment.type
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: "Assignment deleted" });
      // Refresh the assignments list
      await fetchAssignments();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({ title: "Failed to delete assignment", variant: "destructive" });
    }
  };

  const toggleStatus = async (id: string) => {
    if (!user) return;

    try {
      const assignment = assignments.find(a => a.id === id);
      if (!assignment) return;

      const statusOrder = ['pending', 'in-progress', 'completed'];
      const currentIndex = statusOrder.indexOf(assignment.status);
      const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

      const { error } = await supabase
        .from('assignments')
        .update({ status: nextStatus })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh the assignments list
      await fetchAssignments();
    } catch (error) {
      console.error('Error updating assignment status:', error);
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const sortedAssignments = [...assignments].sort((a, b) => {
    // Sort by due date, then by priority
    const dateA = new Date(a.dueDate);
    const dateB = new Date(b.dueDate);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return (
    <div className="glass-card p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="mobile-heading font-bold text-foreground">Assignments & Exams</h2>
          <p className="text-muted-foreground mobile-text">Track your academic deadlines</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="neuro-btn w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAssignment ? 'Edit Assignment' : 'Add New Assignment'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Assignment title"
                  className="mobile-text"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="course">Course</Label>
                <Input
                  id="course"
                  value={formData.course}
                  onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
                  placeholder="Course name"
                  className="mobile-text"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Assignment details"
                  className="mobile-text"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="mobile-text"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Assignment['priority'] }))}
                    className="w-full p-2 border rounded-md mobile-text"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Assignment['type'] }))}
                    className="w-full p-2 border rounded-md mobile-text"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="exam">Exam</option>
                    <option value="project">Project</option>
                  </select>
                </div>
              </div>
              
              <Button type="submit" className="w-full mobile-text">
                {editingAssignment ? 'Update Assignment' : 'Add Assignment'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assignment List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="mobile-text">Loading assignments...</p>
          </div>
        ) : sortedAssignments.map((assignment) => {
          const daysUntilDue = getDaysUntilDue(assignment.dueDate);
          const isOverdue = daysUntilDue < 0;
          const isDueSoon = daysUntilDue <= 2 && daysUntilDue >= 0;

          return (
            <div key={assignment.id} className="brutal-card p-4 hover:scale-[1.01] sm:hover:scale-[1.02] transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground mobile-text truncate">{assignment.title}</h3>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={`${getPriorityColor(assignment.priority)} text-xs`}>
                      {assignment.priority}
                    </Badge>
                      <Badge className={`${getStatusColor(assignment.status)} text-xs`}>
                      {assignment.status}
                    </Badge>
                    </div>
                  </div>
                  
                  <p className="text-xs sm:text-sm text-primary mb-1 truncate">{assignment.course}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">{assignment.description}</p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span className="truncate">{new Date(assignment.dueDate).toLocaleDateString()}</span>
                    </div>
                    
                    <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : 'text-muted-foreground'}`}>
                      {isOverdue || isDueSoon ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      <span className="truncate">
                        {isOverdue 
                          ? `${Math.abs(daysUntilDue)} days overdue`
                          : daysUntilDue === 0 
                            ? 'Due today'
                            : `${daysUntilDue} days left`
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <Button
                    onClick={() => toggleStatus(assignment.id)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleEdit(assignment)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(assignment.id)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && assignments.length === 0 && (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="mobile-text">No assignments yet. Click "Add Task" to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}