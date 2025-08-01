import React from 'react';
import { Chat } from '@/components/Chat';
import { useNavigate } from 'react-router-dom';

export const Messages = () => {
  const navigate = useNavigate();

  return (
    <Chat 
      isOpen={true} 
      onClose={() => navigate('/dashboard')}
    />
  );
};