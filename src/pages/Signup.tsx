import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Heart, Mail, Lock, User, ArrowLeft, CheckCircle2 } from "lucide-react";

export const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard');
      }
    });

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

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      console.log('Sending verification email request...');
      
      try {
        // Call the standalone signup invite function
        const { data, error } = await supabase.functions.invoke('send-signup-invite', {
          body: {
            email,
            firstName,
            lastName,
            password
          }
        });

        console.log('Function response received:', { data, error });

        // Handle successful response
        if (data && data.success) {
          console.log('Verification email sent successfully');
          setVerificationSent(true);
          toast({
            title: "Verification email sent! 📧",
            description: "Check your email and click the verification link to complete your signup"
          });
          return;
        }

        // Handle error responses - including non-2xx status codes
        if (error || (data && !data.success)) {
          let errorMessage = 'Failed to send verification email';
          
          // Try to get error from data first (successful function call but application error)
          if (data && data.error) {
            errorMessage = data.error;
          }
          // If we have a FunctionsHttpError, provide a user-friendly message
          else if (error && error.name === 'FunctionsHttpError') {
            // For common scenarios, provide helpful messages
            if (email && email.includes('@')) {
              errorMessage = 'This email address is already registered. Please sign in instead or use a different email address.';
            } else {
              errorMessage = 'There was an issue with your signup request. Please check your information and try again.';
            }
          }
          // Handle other types of errors
          else if (error) {
            if (error.message && error.message.includes('network')) {
              errorMessage = 'Network error. Please check your internet connection and try again.';
            } else {
              errorMessage = 'Failed to connect to email service. Please try again.';
            }
          }

          console.error('Function returned error:', errorMessage);
          throw new Error(errorMessage);
        }

        // This shouldn't happen, but handle unexpected responses
        throw new Error('Unexpected response from signup service. Please try again.');

      } catch (functionError: any) {
        console.error('Function call error:', functionError);
        throw functionError; // Re-throw to be caught by outer try-catch
      }

    } catch (error: any) {
      console.error('Signup error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Show user-friendly error message
      toast({
        title: "Sign up failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
            Create your account to get started
          </p>
        </div>

        <Card className="shadow-romantic mx-2 sm:mx-0">
          {verificationSent ? (
            <>
              <CardHeader className="pb-4 sm:pb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-romance rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail size={24} className="text-white sm:w-8 sm:h-8" />
                </div>
                <CardTitle className="text-center font-poppins font-bold text-lg sm:text-xl">
                  Check Your Email
                </CardTitle>
                <CardDescription className="text-center font-inter font-semibold text-sm">
                  We've sent a verification link to your email
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4 px-4 sm:px-6">
                <div className="space-y-2">
                  <p className="font-medium text-foreground text-sm">
                    A verification link has been sent to:
                  </p>
                  <p className="font-bold text-primary text-sm break-all">{email}</p>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <CheckCircle2 size={16} />
                    <span className="font-semibold text-sm">Important Steps:</span>
                  </div>
                  <ol className="text-xs text-blue-700 space-y-1 text-left">
                    <li>1. Check your email inbox (and spam folder)</li>
                    <li>2. Click the "Verify Email Address" button</li>
                    <li>3. Your account will be created automatically</li>
                    <li>4. You can then sign in with your credentials</li>
                  </ol>
                </div>
                
                <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                  <p>The verification link will expire in 24 hours.</p>
                  <p>Didn't receive the email? Check your spam folder.</p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setVerificationSent(false)}
                    variant="outline"
                    className="flex-1 text-sm"
                  >
                    Back to Form
                  </Button>
                  <Button 
                    onClick={() => navigate('/auth')}
                    variant="romantic"
                    className="flex-1 text-sm"
                  >
                    Go to Sign In
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-4 sm:pb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Link to="/auth">
                    <Button variant="ghost" size="sm" className="p-2">
                      <ArrowLeft size={16} />
                    </Button>
                  </Link>
                  <div>
                    <CardTitle className="font-poppins font-bold text-lg sm:text-xl">
                      Create Account
                    </CardTitle>
                    <CardDescription className="font-inter font-semibold text-sm">
                      Join Love Sync with email verification
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="px-4 sm:px-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10 font-medium h-11 text-sm"
                        disabled={loading}
                      />
                    </div>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="pl-10 font-medium h-11 text-sm"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 font-medium h-11 text-sm"
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Create password (min 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 font-medium h-11 text-sm"
                      disabled={loading}
                    />
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-3 rounded-lg mt-4">
                  <div className="flex items-center gap-2 text-amber-800 mb-1">
                    <Mail size={14} />
                    <span className="font-semibold text-xs">Email Verification Required</span>
                  </div>
                  <p className="text-xs text-amber-700">
                    You'll receive a verification email before your account is created. This ensures your account is secure.
                  </p>
                </div>
                
                <Button 
                  onClick={handleSignUp}
                  disabled={loading}
                  variant="romantic"
                  className="w-full h-11 text-sm font-bold mt-6"
                >
                  {loading ? "Sending verification email..." : "Send Verification Email"}
                </Button>
                
                <div className="text-center mt-4">
                  <p className="text-xs text-muted-foreground">
                    Already have an account?{" "}
                    <Link to="/auth" className="text-primary font-semibold hover:underline">
                      Sign in instead
                    </Link>
                  </p>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};