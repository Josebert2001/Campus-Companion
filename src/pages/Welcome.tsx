import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  Clock, 
  BookOpen, 
  Brain, 
  ArrowRight, 
  CheckCircle,
  Calendar,
  MessageSquare 
} from 'lucide-react';

export default function Welcome() {
  const features = [
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Auto-generate your timetable and never miss a class again",
      highlight: "Never miss class"
    },
    {
      icon: BookOpen,
      title: "Assignment Tracker",
      description: "Track deadlines and get reminders for all your tasks",
      highlight: "Stay organized"
    },
    {
      icon: Brain,
      title: "AI Study Companion",
      description: "Get instant help with questions and generate study materials",
      highlight: "24/7 AI help"
    }
  ];

  const benefits = [
    "Reduce missed deadlines by 80%",
    "Save 2+ hours daily on planning",
    "AI-powered study assistance",
    "University of Uyo optimized"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/5 to-background">
      {/* Navigation */}
      <nav className="p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary rounded-xl">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-primary">Campus Companion</span>
          </div>
          <Link to="/auth">
            <Button variant="outline" className="glass-panel">
              Sign In
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium">
                  🎓 Made for University of Uyo Students
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
                  Your AI-Powered
                  <span className="text-gradient bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Academic</span>
                  <br />
                  Assistant
                </h1>
                <p className="text-xl text-muted-foreground max-w-lg">
                  Never miss another deadline, stay organized, and get AI help with your studies. 
                  Campus Companion makes university life easier.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth">
                  <Button size="lg" className="brutal-btn group">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="glass-panel">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  See Demo
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content - Feature Preview */}
            <div className="relative">
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Today's Schedule</h3>
                    <p className="text-xs text-muted-foreground">3 classes, 2 assignments due</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="schedule-card">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Advanced Mathematics</p>
                        <p className="text-sm text-muted-foreground">Dr. Smith • Room 204</p>
                      </div>
                      <span className="text-sm font-medium text-primary">09:00</span>
                    </div>
                  </div>
                  
                  <div className="schedule-card">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Physics Lab</p>
                        <p className="text-sm text-muted-foreground">Prof. Johnson • Lab B12</p>
                      </div>
                      <span className="text-sm font-medium text-secondary">14:00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 bg-gradient-to-r from-background to-accent/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Campus Companion combines smart scheduling, task management, and AI assistance 
              in one powerful platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="glass-card p-8 text-center hover:scale-105 transition-all duration-300">
                <div className="inline-flex p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl mb-6">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground mb-4">{feature.description}</p>
                <div className="inline-flex px-3 py-1 bg-secondary/10 text-secondary text-sm font-medium rounded-full">
                  {feature.highlight}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Transform Your Academic Life?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join hundreds of University of Uyo students who've improved their grades 
              and reduced stress with Campus Companion.
            </p>
            <Link to="/auth">
              <Button size="lg" className="brutal-btn group">
                Start Your Journey
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border/40">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-muted-foreground">
            © 2025 Campus Companion. Built with ❤️ for University of Uyo students.
          </p>
        </div>
      </footer>
    </div>
  );
}