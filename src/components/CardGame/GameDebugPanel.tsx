import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { CardImporter } from '@/utils/cardImporter';
import { DeckManager } from '@/utils/deckManager';
import { useToast } from '@/hooks/use-toast';

interface GameDebugPanelProps {
  sessionId: string;
  isVisible?: boolean;
}

export const GameDebugPanel: React.FC<GameDebugPanelProps> = ({ 
  sessionId, 
  isVisible = false 
}) => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!isVisible) return null;

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      // Check cards in database
      const { data: cardCounts } = await supabase
        .from('deck_cards')
        .select('response_type')
        .eq('is_active', true);
        
      const dbDistribution = cardCounts?.reduce((acc, card) => {
        acc[card.response_type] = (acc[card.response_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Check current game deck
      const { data: deckCards } = await supabase
        .from('game_decks')
        .select('deck_cards(response_type)')
        .eq('session_id', sessionId);
        
      const deckDistribution = deckCards?.reduce((acc, item) => {
        const type = item.deck_cards?.response_type;
        if (type) acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Check session info
      const { data: session } = await supabase
        .from('card_deck_game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      setDebugInfo({
        databaseCards: dbDistribution,
        gameDeck: deckDistribution,
        deckSize: deckCards?.length || 0,
        session: session,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Diagnostics Complete",
        description: "Debug information updated"
      });

    } catch (error) {
      console.error('Diagnostics failed:', error);
      toast({
        title: "Diagnostics Failed",
        description: "Check console for details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const importCards = async () => {
    setLoading(true);
    try {
      const importer = new CardImporter();
      const distribution = await importer.importAllCards();
      
      toast({
        title: "Cards Imported Successfully",
        description: `Distribution: ${JSON.stringify(distribution)}`
      });

      // Run diagnostics after import
      await runDiagnostics();

    } catch (error) {
      console.error('Card import failed:', error);
      toast({
        title: "Card Import Failed",
        description: "Check console for details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const recreateDeck = async () => {
    setLoading(true);
    try {
      // Simple reset - clear game state and let drawCard handle random selection
      await supabase
        .from('card_deck_game_sessions')
        .update({
          current_card_id: null,
          played_cards: [],
          skipped_cards: [],
          total_cards_played: 0
        })
        .eq('id', sessionId);
      
      toast({
        title: "Game Reset",
        description: "Cleared all cards, ready for fresh random draws"
      });

      // Run diagnostics after deck creation
      await runDiagnostics();

    } catch (error) {
      console.error('Deck recreation failed:', error);
      toast({
        title: "Deck Recreation Failed",
        description: "Check console for details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-96 bg-black text-white border-gray-700 z-50 max-h-96 overflow-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">🐛 Debug Panel</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Button 
            onClick={runDiagnostics}
            disabled={loading}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Diagnostics
          </Button>
          
          <Button 
            onClick={importCards}
            disabled={loading}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Import Cards
          </Button>

          <Button 
            onClick={recreateDeck}
            disabled={loading}
            size="sm"
            variant="outline" 
            className="text-xs"
          >
            Recreate Deck
          </Button>
        </div>
        
        {debugInfo && (
          <div className="text-xs space-y-2 font-mono">
            <div>
              <strong>Database Cards:</strong>
              <div className="pl-2">
                {JSON.stringify(debugInfo.databaseCards, null, 2)}
              </div>
            </div>
            
            <div>
              <strong>Game Deck ({debugInfo.deckSize} cards):</strong>
              <div className="pl-2">
                {JSON.stringify(debugInfo.gameDeck, null, 2)}
              </div>
            </div>

            <div>
              <strong>Session Info:</strong>
              <div className="pl-2">
                Card Index: {debugInfo.session?.current_card_index}<br/>
                Cards Played: {debugInfo.session?.cards_played}<br/>
                Status: {debugInfo.session?.status}
              </div>
            </div>

            <div className="text-gray-400">
              Last updated: {new Date(debugInfo.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center text-yellow-400">
            Processing...
          </div>
        )}
      </CardContent>
    </Card>
  );
};