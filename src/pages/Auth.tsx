import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Heart, Mail, Lock, User } from "lucide-react";

export const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in or handle verification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/');
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        navigate('/');
      }
    });

    // Handle email verification from URL
    const handleVerification = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (!error) {
          navigate('/');
        }
      }
    };

    handleVerification();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async () => {
    if (!email || !password || !firstName || !lastName) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setVerificationSent(true);
      toast({
        title: "Welcome to Love Sync! 💕",
        description: "Check your email to confirm your account"
      });
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please enter your email and password",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Welcome back! 💕",
        description: "Successfully signed in"
      });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-romance flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 animate-pulse">
            <Heart size={32} className="text-white sm:w-10 sm:h-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-poppins text-white mb-2">
            Love Sync
          </h1>
          <p className="text-sm sm:text-base text-white/80 font-inter font-bold px-2">
            Where hearts connect and love grows
          </p>
        </div>

        <Card className="shadow-romantic mx-2 sm:mx-0">
          {verificationSent ? (
            <>
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-center font-poppins font-bold text-lg sm:text-xl">Check Your Email</CardTitle>
                <CardDescription className="text-center font-inter font-semibold text-sm">
                  We've sent a verification link to your email
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4 px-4 sm:px-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-romance rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Mail size={24} className="text-white sm:w-8 sm:h-8" />
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-foreground text-sm">
                    A verification link has been sent to:
                  </p>
                  <p className="font-bold text-primary text-sm break-all">{email}</p>
                </div>
                <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                  <p>Click the link in your email to verify your account.</p>
                  <p>Once verified, you'll be automatically signed in.</p>
                </div>
                <Button 
                  onClick={() => setVerificationSent(false)}
                  variant="outline"
                  className="w-full text-sm"
                >
                  Back to Sign In
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-center font-poppins font-bold text-lg sm:text-xl">Join Love Sync</CardTitle>
                <CardDescription className="text-center font-inter font-semibold text-sm">
                  Create your account or sign in to continue
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
                    <TabsTrigger value="signin" className="font-bold text-xs sm:text-sm">Sign In</TabsTrigger>
                    <TabsTrigger value="signup" className="font-bold text-xs sm:text-sm">Sign Up</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="signin" className="space-y-3 sm:space-y-4 mt-4">
                    <div className="space-y-3">
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 font-medium h-11 text-sm"
                        />
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 font-medium h-11 text-sm"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleSignIn}
                      disabled={loading}
                      variant="romantic"
                      className="w-full h-11 text-sm font-bold"
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-3 sm:space-y-4 mt-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="First name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="pl-10 font-medium h-11 text-sm"
                          />
                        </div>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Last name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="pl-10 font-medium h-11 text-sm"
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 font-medium h-11 text-sm"
                        />
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 font-medium h-11 text-sm"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleSignUp}
                      disabled={loading}
                      variant="romantic"
                      className="w-full h-11 text-sm font-bold"
                    >
                      {loading ? "Creating account..." : "Create Account"}
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};