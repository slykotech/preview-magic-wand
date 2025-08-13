import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Heart, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if this is a valid password reset session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
      } else {
        toast({
          title: "Invalid reset link",
          description: "This password reset link is invalid or has expired",
          variant: "destructive"
        });
        navigate('/auth');
      }
    };

    checkSession();
  }, [navigate, toast]);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
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

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setPasswordReset(true);
      toast({
        title: "Password updated! 🎉",
        description: "Your password has been successfully updated"
      });
    }
  };

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-romance flex items-center justify-center p-3 sm:p-4">
        <div className="text-center text-white">
          <Heart size={48} className="mx-auto mb-4 animate-pulse" />
          <p>Checking reset link...</p>
        </div>
      </div>
    );
  }

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
            Create your new password
          </p>
        </div>

        <Card className="shadow-romantic mx-2 sm:mx-0">
          {passwordReset ? (
            <>
              <CardHeader className="pb-4 sm:pb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-romance rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={24} className="text-white sm:w-8 sm:h-8" />
                </div>
                <CardTitle className="text-center font-poppins font-bold text-lg sm:text-xl">
                  Password Updated!
                </CardTitle>
                <CardDescription className="text-center font-inter font-semibold text-sm">
                  Your password has been successfully changed
                </CardDescription>
              </CardHeader>
              
              <CardContent className="text-center px-4 sm:px-6">
                <p className="text-sm text-muted-foreground mb-6">
                  You can now sign in with your new password.
                </p>
                <Button 
                  onClick={() => navigate('/auth')}
                  variant="romantic"
                  className="w-full text-sm font-bold"
                >
                  Go to Sign In
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-center font-poppins font-bold text-lg sm:text-xl">
                  Reset Password
                </CardTitle>
                <CardDescription className="text-center font-inter font-semibold text-sm">
                  Enter your new password below
                </CardDescription>
              </CardHeader>
              
              <CardContent className="px-4 sm:px-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="New password (min 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  </div>
                  
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 font-medium h-11 text-sm"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={loading}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-3 rounded-lg mt-4">
                  <p className="text-xs text-amber-700">
                    Your new password must be at least 6 characters long for security.
                  </p>
                </div>
                
                <Button 
                  onClick={handleResetPassword}
                  disabled={loading}
                  variant="romantic"
                  className="w-full h-11 text-sm font-bold mt-6"
                >
                  {loading ? "Updating Password..." : "Update Password"}
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};