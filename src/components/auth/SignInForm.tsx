import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Mail, Lock } from 'lucide-react';

interface SignInFormProps {
  onToggleMode: () => void;
}

export function SignInForm({ onToggleMode }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (!error) {
      // Success will be handled by auth state change
    }
    
    setIsLoading(false);
  };

  return (
    <div className="glass-card p-8 w-full max-w-md">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your Campus Companion account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your.email@uniuyo.edu.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <Button
            type="submit"
            className="w-full neuro-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button
              onClick={onToggleMode}
              className="text-primary hover:underline font-medium"
            >
              Sign up here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}