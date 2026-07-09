import { motion } from "framer-motion";
import { MapPin, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const fallbackCities = [
  { id: "1", name: "Delhi-NCR", state: "Delhi", college_count: 450, image_url: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop" },
  { id: "2", name: "Maharashtra", state: "Maharashtra", college_count: 380, image_url: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400&h=300&fit=crop" },
  { id: "3", name: "Haryana", state: "Haryana", college_count: 310, image_url: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=300&fit=crop" },
  { id: "4", name: "Karnataka", state: "Karnataka", college_count: 420, image_url: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400&h=300&fit=crop" },
  { id: "5", name: "Tamil Nadu", state: "Tamil Nadu", college_count: 350, image_url: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400&h=300&fit=crop" },
  { id: "6", name: "Uttar Pradesh", state: "Uttar Pradesh", college_count: 500, image_url: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&h=300&fit=crop" },
  { id: "7", name: "Rajasthan", state: "Rajasthan", college_count: 270, image_url: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=400&h=300&fit=crop" },
  { id: "8", name: "West Bengal", state: "West Bengal", college_count: 290, image_url: "https://images.unsplash.com/photo-1558431382-27e303142255?w=400&h=300&fit=crop" },
];

export function CitySearch() {
  const { data: places } = useQuery({
    queryKey: ["popular-places"],
    queryFn: async () => {
      const { data } = await supabase
        .from("popular_places")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(12);
      return data?.length ? data : fallbackCities;
    },
    staleTime: 10 * 60 * 1000,
  });

  const cities = places ?? fallbackCities;

  return (
    <section className="py-10 md:py-14" aria-labelledby="city-search-heading">
      <div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-6">
          <h2 id="city-search-heading" className="text-headline font-bold text-foreground">
            Top <span className="text-gradient">Study Places</span>
          </h2>
        </motion.div>

        {/* Single-line horizontal scroll carousel with image cards */}
        <div className="flex gap-4 overflow-x-auto overflow-y-clip pb-3 scrollbar-hide snap-x snap-mandatory">
          {cities.map((place, i) => (
            <motion.div
              key={place.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="snap-start flex-shrink-0"
            >
               <Link
                 to={`/colleges?state=${encodeURIComponent(place.state)}`}
                 className="group relative block w-44 sm:w-52 h-36 sm:h-40 rounded-2xl overflow-hidden"
              >
                <img
                  src={place.image_url || `https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop`}
                  alt={place.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-base font-bold text-card uppercase tracking-wide">
                    {place.name}
                  </h3>
                  <span className="text-[11px] text-card/80">{place.college_count}+ Colleges</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-5">
          <Link to="/colleges">
            <Button variant="outline" className="rounded-xl border-border hover:bg-primary/5">
              Show All <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
