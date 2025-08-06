import { useState } from 'react';
import { useSubscription } from './useSubscription';

export const useSubscriptionGate = () => {
  const { subscriptionInfo } = useSubscription();
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptFeature, setPromptFeature] = useState<string>();

  const checkFeatureAccess = (featureName?: string): boolean => {
    if (!subscriptionInfo.isLoading && !subscriptionInfo.isActive) {
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