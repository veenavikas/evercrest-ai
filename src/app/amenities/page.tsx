"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar as CalendarIcon, CheckCircle2, Clock, Umbrella } from "lucide-react";

export default function AmenitiesPage() {
  const [amenities, setAmenities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmenity, setSelectedAmenity] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/amenities")
      .then(res => res.json())
      .then(d => {
        if (d.amenities) setAmenities(d.amenities);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const checkAvailability = (amenity: any, selectedDate: string) => {
    setSelectedAmenity(amenity);
    setDate(selectedDate);
    setSuccess(false);
    fetch(`/api/amenities/${amenity.id}/availability?date=${selectedDate}`)
      .then(res => res.json())
      .then(d => setSlots(d.slots || []));
  };

  const bookSlot = async (startTime: string) => {
    setBookingLoading(true);
    try {
      const res = await fetch(`/api/amenities/${selectedAmenity.id}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime, partySize: 1 })
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        alert("Failed to book slot. It might be already taken.");
      }
    } catch (e) {
      console.error(e);
      alert("Error booking slot.");
    }
    setBookingLoading(false);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading amenities...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/chat" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Chat</span>
          </Link>
          <h1 className="font-semibold text-gray-800">Amenities & Booking</h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        {success ? (
          <div className="bg-green-50 border border-green-200 p-8 rounded-xl text-center shadow-sm">
            <CheckCircle2 className="mx-auto text-green-500 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Booking Confirmed!</h2>
            <p className="text-green-600 mb-6">Your slot for {selectedAmenity?.name} has been successfully reserved.</p>
            <button 
              onClick={() => { setSuccess(false); setSelectedAmenity(null); }}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Book Another
            </button>
          </div>
        ) : selectedAmenity ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedAmenity.name}</h2>
                <p className="text-sm text-gray-500">Select a date and time to book your slot.</p>
              </div>
              <button 
                onClick={() => setSelectedAmenity(null)}
                className="text-gray-500 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => checkAvailability(selectedAmenity, e.target.value)}
                  className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <h3 className="text-sm font-medium text-gray-700 mb-3">Available Slots</h3>
              {slots.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {slots.map((slot, i) => (
                    <button
                      key={i}
                      disabled={!slot.available || bookingLoading}
                      onClick={() => bookSlot(slot.startTime)}
                      className={`py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                        slot.available 
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                          : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      }`}
                    >
                      <Clock size={16} />
                      {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                  No slots available for this date.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {amenities.map(a => (
              <div key={a.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                  <Umbrella size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{a.name}</h3>
                <p className="text-sm text-gray-500 flex-1 mb-4">{a.description}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                  <Clock size={16} />
                  <span>{a.openTime} - {a.closeTime}</span>
                </div>
                
                {a.requiresBooking ? (
                  <button 
                    onClick={() => checkAvailability(a, date)}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CalendarIcon size={18} /> Book a Slot
                  </button>
                ) : (
                  <div className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-lg font-medium text-center">
                    No Booking Required
                  </div>
                )}
              </div>
            ))}
            {amenities.length === 0 && (
              <div className="col-span-full text-center py-16 text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">
                <Umbrella className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-lg">No amenities available for your property.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
