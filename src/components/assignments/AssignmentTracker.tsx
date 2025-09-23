import { useState } from 'react';
import { Plus, Calendar, Clock, AlertTriangle, CheckCircle2, Edit, Trash2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

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
  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'Calculus Problem Set 5',
      course: 'Advanced Mathematics',
      description: 'Complete problems 1-20 from Chapter 8',
      dueDate: '2025-01-30',
      priority: 'high',
      status: 'pending',
      type: 'assignment'
    },
    {
      id: '2',
      title: 'Physics Lab Report',
      course: 'Physics Lab',
      description: 'Analyze oscillation experiments and write detailed report',
      dueDate: '2025-02-02',
      priority: 'medium',
      status: 'in-progress',
      type: 'assignment'
    },
    {
      id: '3',
      title: 'Midterm Examination',
      course: 'Computer Science',
      description: 'Covers algorithms, data structures, and complexity analysis',
      dueDate: '2025-02-05',
      priority: 'high',
      status: 'pending',
      type: 'exam'
    }
  ]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingAssignment) {
      // Update existing assignment
      setAssignments(prev => prev.map(assignment => 
        assignment.id === editingAssignment.id 
          ? { ...assignment, ...formData, status: assignment.status }
          : assignment
      ));
      toast({ title: "Assignment updated successfully!" });
    } else {
      // Create new assignment
      const newAssignment: Assignment = {
        id: Date.now().toString(),
        ...formData,
        status: 'pending'
      };
      setAssignments(prev => [...prev, newAssignment]);
      toast({ title: "Assignment added successfully!" });
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

  const handleDelete = (id: string) => {
    setAssignments(prev => prev.filter(assignment => assignment.id !== id));
    toast({ title: "Assignment deleted" });
  };

  const toggleStatus = (id: string) => {
    setAssignments(prev => prev.map(assignment => {
      if (assignment.id === id) {
        const statusOrder = ['pending', 'in-progress', 'completed'];
        const currentIndex = statusOrder.indexOf(assignment.status);
        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
        return { ...assignment, status: nextStatus as Assignment['status'] };
      }
      return assignment;
    }));
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
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Assignments & Exams</h2>
          <p className="text-muted-foreground">Track your academic deadlines</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="neuro-btn">
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
                    className="w-full p-2 border rounded-md"
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
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="exam">Exam</option>
                    <option value="project">Project</option>
                  </select>
                </div>
              </div>
              
              <Button type="submit" className="w-full">
                {editingAssignment ? 'Update Assignment' : 'Add Assignment'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assignment List */}
      <div className="space-y-4">
        {sortedAssignments.map((assignment) => {
          const daysUntilDue = getDaysUntilDue(assignment.dueDate);
          const isOverdue = daysUntilDue < 0;
          const isDueSoon = daysUntilDue <= 2 && daysUntilDue >= 0;

          return (
            <div key={assignment.id} className="brutal-card p-4 hover:scale-[1.02] transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{assignment.title}</h3>
                    <Badge className={getPriorityColor(assignment.priority)}>
                      {assignment.priority}
                    </Badge>
                    <Badge className={getStatusColor(assignment.status)}>
                      {assignment.status}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-primary mb-1">{assignment.course}</p>
                  <p className="text-sm text-muted-foreground mb-3">{assignment.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(assignment.dueDate).toLocaleDateString()}</span>
                    </div>
                    
                    <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : 'text-muted-foreground'}`}>
                      {isOverdue || isDueSoon ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      <span>
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
                
                <div className="flex items-center gap-2">
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

        {assignments.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No assignments yet. Click "Add Task" to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}