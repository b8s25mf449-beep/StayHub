import ChannelList from '@/components/channels/ChannelList';
import { Globe2 } from 'lucide-react';

export default function ChannelsPage() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6 animate-fade-up delay-0">
        <div className="w-8 h-8 rounded-lg bg-[#0f766e22] flex items-center justify-center">
          <Globe2 size={15} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Canales</h2>
          <p className="text-xs text-muted mt-0.5">
            Conectá cada habitación con Booking.com, Airbnb u otros canales vía iCal
          </p>
        </div>
      </div>
      <ChannelList />
    </div>
  );
}
