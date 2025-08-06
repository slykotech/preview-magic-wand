import React from 'react';
import { TargetedCityScraper } from '@/components/TargetedCityScraper';
import { GradientHeader } from '@/components/GradientHeader';
import { Globe } from 'lucide-react';

export default function EventScraper() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <GradientHeader 
        title="Event Scraper"
        subtitle="Discover events from major cities worldwide"
        icon={<Globe className="w-6 h-6" />}
      />
      
      <div className="container mx-auto px-4 py-8">
        <TargetedCityScraper />
      </div>
    </div>
  );
}