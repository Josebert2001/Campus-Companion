import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, BookOpen, Brain, Clock } from 'lucide-react';

export default function Auth() {
  const [isSignIn, setIsSignIn] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Clock,
      title: "Smart Scheduling",
      description: "Auto-generate your timetable and never miss a class again"
    },
    {
      icon: BookOpen,
      title: "Assignment Tracker",
      description: "Track deadlines and get reminders for all your tasks"
    },
    {
      icon: Brain,
      title: "AI Study Companion",
      description: "Get instant help with questions and generate study materials"
    },
    {
      icon: GraduationCap,
      title: "Academic Success",
      description: "Built specifically for University of Uyo students"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-background flex flex-col lg:flex-row">
      {/* Left Panel - Features */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col justify-center mobile-padding py-8">
        <div className="max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
              Campus Companion
            </h2>
            <p className="text-base lg:text-lg text-muted-foreground">
              Your AI-powered academic assistant for University of Uyo
            </p>
          </div>
          
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="glass-panel p-4 lg:p-6 hover:scale-[1.02] lg:hover:scale-105 transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className="bg-secondary/10 p-2 rounded-xl">
                    <feature.icon className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1 mobile-text">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Right Panel - Auth Form */}
      <div className="flex-1 lg:flex-initial lg:w-96 xl:w-[480px] flex items-center justify-center mobile-padding py-8">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">Campus Companion</h1>
            <p className="text-muted-foreground mobile-text">University of Uyo Academic Assistant</p>
          </div>
          
          {isSignIn ? (
            <SignInForm onToggleMode={() => setIsSignIn(false)} />
          ) : (
            <SignUpForm onToggleMode={() => setIsSignIn(true)} />
          )}
        </div>
      </div>
    </div>
  );
}