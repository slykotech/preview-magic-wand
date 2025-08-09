import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Heart, Mail, Lock, Eye, EyeOff } from "lucide-react";

export const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<'mismatch' | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  useEffect(() => {
    // Prefill email from query param if present
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }

    // Check if this is a password reset redirect
    const isPasswordReset = searchParams.get('reset') === 'true';
    if (isPasswordReset) {
      navigate('/reset-password');
      return;
    }

    // Check if user is already logged in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Simply go to dashboard - SubscriptionGate will handle subscription check
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

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
      // Show friendly message and inline hint below password
      const isInvalidCreds = /invalid login credentials/i.test(error.message);
      setPasswordStatus(isInvalidCreds ? 'mismatch' : null);
      
      if (isInvalidCreds) {
        toast({
          title: "Sign in failed",
          description: "Email and password do not match. If you just signed up, make sure you clicked the verification link in your email first.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sign in failed", 
          description: error.message,
          variant: "destructive"
        });
      }
    } else {
      setPasswordStatus(null);
      toast({
        title: "Welcome back! 💕",
        description: "Successfully signed in"
      });
      // Navigation is handled by the auth state change listener
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setResetEmailSent(true);
      toast({
        title: "Reset email sent! 📧",
        description: "Check your email for password reset instructions"
      });
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
            Sign in to your account
          </p>
        </div>

        <Card className="shadow-romantic mx-2 sm:mx-0">
          {showForgotPassword ? (
            <>
              <CardHeader className="pb-4 sm:pb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-romance rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail size={24} className="text-white sm:w-8 sm:h-8" />
                </div>
                <CardTitle className="text-center font-poppins font-bold text-lg sm:text-xl">
                  {resetEmailSent ? "Check Your Email" : "Reset Password"}
                </CardTitle>
                <CardDescription className="text-center font-inter font-semibold text-sm">
                  {resetEmailSent 
                    ? "We've sent password reset instructions to your email"
                    : "Enter your email to receive reset instructions"
                  }
                </CardDescription>
              </CardHeader>
              
              <CardContent className="px-4 sm:px-6">
                {resetEmailSent ? (
                  <div className="text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                      A password reset link has been sent to:
                    </p>
                    <p className="font-bold text-primary text-sm break-all">{email}</p>
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-4 rounded-lg">
                      <p className="text-xs text-blue-700">
                        Click the link in your email to reset your password. The link will expire in 1 hour.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => {
                          setShowForgotPassword(false);
                          setResetEmailSent(false);
                        }}
                        variant="outline"
                        className="flex-1 text-sm"
                      >
                        Back to Sign In
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 font-medium h-11 text-sm"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-6">
                      <Button 
                        onClick={() => setShowForgotPassword(false)}
                        variant="outline"
                        className="flex-1 text-sm"
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleForgotPassword}
                        disabled={loading}
                        variant="romantic"
                        className="flex-1 text-sm font-bold"
                      >
                        {loading ? "Sending..." : "Send Reset Email"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-center font-poppins font-bold text-lg sm:text-xl">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-center font-inter font-semibold text-sm">
                  Sign in to continue your love journey
                </CardDescription>
              </CardHeader>
          
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 font-medium h-11 text-sm"
                  disabled={loading}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordStatus(null); }}
                  className="pl-10 pr-10 font-medium h-11 text-sm"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {passwordStatus === 'mismatch' && (
                  <p className="mt-1 text-xs text-destructive">Email and password do not match</p>
                )}
              </div>
            </div>
            
            <Button 
              onClick={handleSignIn}
              disabled={loading}
              variant="romantic"
              className="w-full h-11 text-sm font-bold mt-6"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary hover:underline font-medium"
                disabled={loading}
              >
                Forgot your password?
              </button>
            </div>
            
            <div className="text-center mt-6 space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">New to Love Sync?</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Link to="/signup">
                  <Button variant="outline" className="w-full">
                    Create New Account
                  </Button>
                </Link>
                
                <p className="text-xs text-muted-foreground">
                  By creating an account, you agree to our{" "}
                  <a href="#" className="text-primary hover:underline">Terms of Service</a>
                  {" "}and{" "}
                  <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                </p>
              </div>
            </div>
          </CardContent>
          </>
          )}
        </Card>
      </div>
    </div>
  );
};