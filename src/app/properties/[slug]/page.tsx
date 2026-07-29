import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { properties, amenities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Building2, MapPin, Phone, Mail, ArrowLeft, Calendar, Info, Clock, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;

  const [property] = await db.select().from(properties).where(eq(properties.slug, slug));

  if (!property || !property.isActive) {
    notFound();
  }

  const propertyAmenities = await db.select().from(amenities).where(eq(amenities.propertyId, property.id));

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium">
            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
              <ArrowLeft size={18} className="transform group-hover:-translate-x-1 transition-transform" />
            </div>
            <span>Back to Portfolio</span>
          </Link>
          <Link 
            href="/login" 
            className="text-sm font-bold text-indigo-600 bg-indigo-50 px-5 py-2 rounded-full hover:bg-indigo-100 transition-colors"
          >
            Resident Login
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 w-full">
        {/* Property Hero */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-indigo-900/5 overflow-hidden mb-12 relative group">
          <div className="aspect-[21/9] bg-slate-900 relative flex items-center justify-center text-slate-700 overflow-hidden">
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-10"></div>
            <Building2 size={120} className="opacity-20 transform group-hover:scale-105 transition-transform duration-700" />
            
            <div className="absolute bottom-12 left-12 right-12 z-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="text-white">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white font-medium text-sm mb-4 border border-white/10">
                  <MapPin size={14} />
                  <span>{property.city}, {property.state}</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tight">{property.name}</h1>
                <p className="text-lg text-slate-300 flex items-center gap-2">
                  <MapPin size={18} />
                  {property.addressLine1}, {property.city}, {property.state} {property.postalCode}
                </p>
              </div>
              
              <Link 
                href="/login" 
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-indigo-900 font-bold rounded-full hover:bg-indigo-50 transition-colors shrink-0"
              >
                Tenant Portal
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Info size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">About the Property</h2>
              </div>
              <p className="text-lg text-slate-600 leading-relaxed">
                {property.description || "Discover premium living in the heart of the city."}
              </p>
            </section>

            <section className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Building2 size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Premium Amenities</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {propertyAmenities.map(amenity => (
                  <div key={amenity.id} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/50 transition-colors">
                    <h3 className="font-bold text-slate-900 text-xl mb-2">{amenity.name}</h3>
                    <p className="text-sm text-slate-600 mb-4">{amenity.description}</p>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock size={14} />
                        <span>{amenity.openTime} - {amenity.closeTime}</span>
                      </div>
                      {amenity.requiresBooking ? (
                        <span className="text-indigo-600 bg-indigo-100/50 px-2.5 py-1 rounded-md">Bookable</span>
                      ) : (
                        <span className="text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-md">Walk-in</span>
                      )}
                    </div>
                  </div>
                ))}
                {propertyAmenities.length === 0 && (
                  <div className="col-span-full py-8 text-center text-slate-500">
                    Amenities are currently being updated.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl shadow-slate-900/10">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <Phone size={20} className="text-indigo-400" /> 
                Contact Management
              </h3>
              <div className="space-y-6">
                {property.contactPhone && (
                  <div className="group flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 transition-colors">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 font-medium mb-1">Phone</p>
                      <p className="text-lg font-semibold">{property.contactPhone}</p>
                    </div>
                  </div>
                )}
                {property.contactEmail && (
                  <div className="group flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 transition-colors">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 font-medium mb-1">Email</p>
                      <a href={`mailto:${property.contactEmail}`} className="text-lg font-semibold hover:text-indigo-300 transition-colors break-all">
                        {property.contactEmail}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-indigo-50 p-8 rounded-[2rem] border border-indigo-100">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center mb-6">
                <Calendar size={24} />
              </div>
              <h3 className="text-xl font-bold text-indigo-900 mb-3">Schedule a Tour</h3>
              <p className="text-indigo-700/80 mb-6 leading-relaxed">
                Interested in making {property.name} your new home? Contact our leasing office to schedule a personal tour.
              </p>
              <a href={`mailto:${property.contactEmail || 'leasing@evercrest.com'}`} className="block w-full text-center py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                Contact Leasing
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 font-medium">
          <p>&copy; {new Date().getFullYear()} Evercrest Properties. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
