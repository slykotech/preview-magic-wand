import { Crown, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEnhancedSubscription } from '@/hooks/useEnhancedSubscription';

export const PremiumBadge = () => {
  const { premiumAccess, loading } = useEnhancedSubscription();

  if (loading || !premiumAccess.has_access) return null;

  const isPartnerLinked = premiumAccess.access_type === 'partner_linked';

  return (
    <Badge 
      variant="secondary" 
      className="bg-gradient-to-r from-primary/20 to-primary-glow/20 text-primary border-primary/30 flex items-center gap-1"
    >
      {isPartnerLinked ? (
        <>
          <Users className="w-3 h-3" />
          Partner Premium
        </>
      ) : (
        <>
          <Crown className="w-3 h-3" />
          {premiumAccess.status === 'trial' ? 'Premium Trial' : 'Premium'}
        </>
      )}
    </Badge>
  );
};