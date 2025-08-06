import { useState } from 'react';
import { useEnhancedSubscription } from './useEnhancedSubscription';

export const useSubscriptionGate = () => {
  const { shouldPromptSubscription } = useEnhancedSubscription();
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptFeature, setPromptFeature] = useState<string>();

  const checkFeatureAccess = (featureName?: string): boolean => {
    if (shouldPromptSubscription()) {
      setPromptFeature(featureName);
      setShowPrompt(true);
      return false;
    }
    return true;
  };

  const closePrompt = () => {
    setShowPrompt(false);
    setPromptFeature(undefined);
  };

  return {
    checkFeatureAccess,
    showPrompt,
    promptFeature,
    closePrompt
  };
};