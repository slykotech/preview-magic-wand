import React, { useEffect } from 'react';
import { Chat } from '@/components/Chat';
import { useNavigate } from 'react-router-dom';

export const Messages = () => {
  const navigate = useNavigate();

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

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <Chat 
        isOpen={true} 
        onClose={() => navigate('/dashboard')}
      />
    </div>
  );
};