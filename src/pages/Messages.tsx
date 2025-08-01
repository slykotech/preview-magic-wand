import React, { useEffect } from 'react';
import { Chat } from '@/components/Chat';
import { useNavigate } from 'react-router-dom';
import { useCoupleData } from '@/hooks/useCoupleData';
import { useAuth } from '@/hooks/useAuth';

export const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { coupleData, loading } = useCoupleData();

  // Hide bottom navigation when entering chat
  useEffect(() => {
    const bottomNav = document.querySelector('[data-bottom-nav]');
    if (bottomNav) {
      (bottomNav as HTMLElement).style.display = 'none';
    }

    // Show bottom navigation when leaving chat
    return () => {
      const bottomNav = document.querySelector('[data-bottom-nav]');
      if (bottomNav) {
        (bottomNav as HTMLElement).style.display = 'flex';
      }
    };
  }, []);

  // Show loading spinner while data is being fetched
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to dashboard if no couple data (user needs to set up partnership first)
  if (!coupleData && !loading) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <Chat 
        isOpen={true} 
        onClose={() => navigate('/dashboard')}
      />
    </div>
  );
};