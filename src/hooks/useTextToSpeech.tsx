import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();

  const speak = useCallback(async (text: string, voice: string = 'nova') => {
    if (!text.trim()) return;

    setIsSpeaking(true);

    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice }
      });

      if (error) throw error;

      // Convert base64 to audio blob and play
      const audioData = atob(data.audioContent);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }

      const audioBlob = new Blob([audioArray], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        toast({
          title: "Playback error",
          description: "Failed to play audio",
          variant: "destructive"
        });
      };

      await audio.play();

    } catch (error) {
      console.error('Text-to-speech error:', error);
      setIsSpeaking(false);
      toast({
        title: "Speech synthesis failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  }, [toast]);

  const stopSpeaking = useCallback(() => {
    setIsSpeaking(false);
    // Stop any currently playing audio
    const audios = document.querySelectorAll('audio');
    audios.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []);

  return {
    isSpeaking,
    speak,
    stopSpeaking
  };
};