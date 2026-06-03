import ChannelList from '@/components/channels/ChannelList';

export default function ChannelsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Canales OTA</h2>
          <p className="text-xs text-muted mt-1">Conectá habitaciones con Booking.com, Airbnb y otros</p>
        </div>
      </div>
      <ChannelList />
    </div>
  );
}
