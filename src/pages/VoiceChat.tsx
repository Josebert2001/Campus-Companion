import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import VoiceConversation from "@/components/voice/VoiceConversation";
import FullDuplexConversation from "@/components/voice/FullDuplexConversation";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function VoiceChat() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | undefined>();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/welcome");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-accent/10 to-secondary/5">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mic className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Voice Chat</h1>
                  <p className="text-xs text-muted-foreground">
                    Have a natural conversation with AI
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto">
              <Tabs defaultValue="hands-free" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="hands-free">
                    Hands-Free Mode
                  </TabsTrigger>
                  <TabsTrigger value="push-to-talk">
                    Push-to-Talk Mode
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="hands-free" className="space-y-4">
                  <div className="text-center space-y-2 mb-6">
                    <h2 className="text-2xl font-bold">Full-Duplex Voice Conversation</h2>
                    <p className="text-muted-foreground">
                      Speak naturally - AI automatically detects when you stop talking and responds
                    </p>
                  </div>
                  <FullDuplexConversation
                    sessionId={sessionId}
                    onSessionChange={setSessionId}
                  />
                </TabsContent>

                <TabsContent value="push-to-talk" className="space-y-4">
                  <div className="text-center space-y-2 mb-6">
                    <h2 className="text-2xl font-bold">Manual Voice Control</h2>
                    <p className="text-muted-foreground">
                      Click to record your voice and get AI responses
                    </p>
                  </div>
                  <VoiceConversation />
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
