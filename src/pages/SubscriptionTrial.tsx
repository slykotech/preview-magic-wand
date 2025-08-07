import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Heart, Calendar, MessageSquare, Camera, BarChart3, Users2, Shield } from 'lucide-react';
import { GradientHeader } from '@/components/GradientHeader';
import { useAuth } from '@/hooks/useAuth';

const features = [
  {
    icon: Heart,
    title: 'Card Games for Couples',
    description: 'Interactive questions and challenges designed to bring you closer together',
    color: 'text-pink-500'
  },
  {
    icon: MessageSquare,
    title: 'AI Relationship Coach',
    description: 'Get personalized advice and insights to strengthen your relationship',
    color: 'text-purple-500'
  },
  {
    icon: Calendar,
    title: 'Smart Date Planner',
    description: 'Discover exciting date ideas tailored to your preferences and location',
    color: 'text-blue-500'
  },
  {
    icon: Camera,
    title: 'Memory Vault',
    description: 'Store and cherish your favorite moments and memories together',
    color: 'text-green-500'
  },
  {
    icon: BarChart3,
    title: 'Relationship Insights',
    description: 'Track your sync score and relationship health over time',
    color: 'text-orange-500'
  },
  {
    icon: Users2,
    title: 'Partner Connection',
    description: 'Stay connected with real-time messaging and shared experiences',
    color: 'text-indigo-500'
  }
];

export const SubscriptionTrial: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Redirect non-authenticated users to auth
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      // Navigate to plan selection
      navigate('/subscription/plans');
    } catch (error) {
      console.error('Error starting trial:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // For now, redirect to dashboard with limited access
    navigate('/dashboard');
  };

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      <GradientHeader 
        title="Start Your Free Trial"
        subtitle={`Welcome ${user.email?.split('@')[0]}! Unlock all premium features`}
        icon="🚀"
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Trial Offer Card */}
          <Card className="mb-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold mb-2">7-Day Free Trial</h2>
              <p className="text-xl mb-4 text-white/90">
                Experience all premium features at no cost
              </p>
              <div className="flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  No commitment
                </div>
                <div className="flex items-center">
                  <Heart className="w-4 h-4 mr-2" />
                  Cancel anytime
                </div>
                <div className="flex items-center">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Full access
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 mb-3`}>
                      <IconComponent className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Trial Benefits */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-center">What's Included in Your Free Trial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-primary">✨ Full Premium Access</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Unlimited card games and challenges</li>
                    <li>• AI-powered relationship coaching</li>
                    <li>• Advanced date planning tools</li>
                    <li>• Unlimited memory storage</li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-primary">🔒 Risk-Free Trial</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• No charges for 7 full days</li>
                    <li>• Cancel anytime with one click</li>
                    <li>• Keep all memories if you cancel</li>
                    <li>• No hidden fees or commitments</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="text-center space-y-4">
            <Button 
              size="lg" 
              className="px-12 py-3 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              onClick={handleStartTrial}
              disabled={loading}
            >
              {loading ? 'Starting Trial...' : 'Start Your Free Trial'}
            </Button>
            
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Your trial starts immediately. We'll ask for payment info to prevent interruptions.
              </p>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                Continue with limited access instead
              </Button>
            </div>
          </div>

          {/* Testimonial */}
          <Card className="mt-8 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">💕</div>
              <blockquote className="text-lg italic text-muted-foreground mb-3">
                "Love Sync has completely transformed how my partner and I connect. The card games are so fun and the AI coach gives amazing advice!"
              </blockquote>
              <cite className="text-sm font-medium">- Sarah M., Premium User</cite>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};