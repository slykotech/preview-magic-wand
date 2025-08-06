import React from 'react';
import { EventScraper } from '@/components/EventScraper';
import { GradientHeader } from '@/components/GradientHeader';
import { Globe } from 'lucide-react';

export default function EventScraperPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <GradientHeader 
        title="Event Scraper"
        subtitle="Scrape real events from Ticketmaster, Eventbrite, BookMyShow and more"
        icon={<Globe className="w-6 h-6" />}
      />
      
      <div className="container mx-auto px-4 py-8">
        <EventScraper />
      </div>
    </div>
  );
}