
-- Create states_cities table to replace hardcoded location arrays
CREATE TABLE IF NOT EXISTS public.states_cities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state text NOT NULL,
  city text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.states_cities ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read states_cities" ON public.states_cities FOR SELECT USING (true);

-- Admin manage
CREATE POLICY "Admins manage states_cities" ON public.states_cities FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role)) 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_states_cities_state ON public.states_cities(state);
CREATE INDEX idx_states_cities_active ON public.states_cities(is_active);

-- Insert all states and cities from the hardcoded data
INSERT INTO public.states_cities (state, city) VALUES
('Andhra Pradesh','Visakhapatnam'),('Andhra Pradesh','Vijayawada'),('Andhra Pradesh','Guntur'),('Andhra Pradesh','Nellore'),('Andhra Pradesh','Kurnool'),('Andhra Pradesh','Tirupati'),('Andhra Pradesh','Rajahmundry'),('Andhra Pradesh','Kakinada'),('Andhra Pradesh','Kadapa'),('Andhra Pradesh','Anantapur'),
('Arunachal Pradesh','Itanagar'),('Arunachal Pradesh','Naharlagun'),('Arunachal Pradesh','Tawang'),('Arunachal Pradesh','Ziro'),('Arunachal Pradesh','Pasighat'),
('Assam','Guwahati'),('Assam','Silchar'),('Assam','Dibrugarh'),('Assam','Jorhat'),('Assam','Nagaon'),('Assam','Tinsukia'),('Assam','Tezpur'),
('Bihar','Patna'),('Bihar','Gaya'),('Bihar','Bhagalpur'),('Bihar','Muzaffarpur'),('Bihar','Purnia'),('Bihar','Darbhanga'),
('Chhattisgarh','Raipur'),('Chhattisgarh','Bhilai'),('Chhattisgarh','Bilaspur'),('Chhattisgarh','Korba'),('Chhattisgarh','Durg'),
('Goa','Panaji'),('Goa','Margao'),('Goa','Vasco da Gama'),('Goa','Mapusa'),
('Gujarat','Ahmedabad'),('Gujarat','Surat'),('Gujarat','Vadodara'),('Gujarat','Rajkot'),('Gujarat','Bhavnagar'),('Gujarat','Gandhinagar'),
('Haryana','Gurugram'),('Haryana','Faridabad'),('Haryana','Panipat'),('Haryana','Ambala'),('Haryana','Karnal'),('Haryana','Hisar'),('Haryana','Rohtak'),('Haryana','Sonipat'),('Haryana','Panchkula'),
('Himachal Pradesh','Shimla'),('Himachal Pradesh','Dharamshala'),('Himachal Pradesh','Mandi'),('Himachal Pradesh','Solan'),('Himachal Pradesh','Kullu'),
('Jharkhand','Ranchi'),('Jharkhand','Jamshedpur'),('Jharkhand','Dhanbad'),('Jharkhand','Bokaro'),('Jharkhand','Deoghar'),
('Karnataka','Bangalore'),('Karnataka','Mysore'),('Karnataka','Hubli'),('Karnataka','Mangalore'),('Karnataka','Belgaum'),('Karnataka','Manipal'),
('Kerala','Thiruvananthapuram'),('Kerala','Kochi'),('Kerala','Kozhikode'),('Kerala','Thrissur'),('Kerala','Kollam'),('Kerala','Palakkad'),
('Madhya Pradesh','Bhopal'),('Madhya Pradesh','Indore'),('Madhya Pradesh','Jabalpur'),('Madhya Pradesh','Gwalior'),('Madhya Pradesh','Ujjain'),
('Maharashtra','Mumbai'),('Maharashtra','Pune'),('Maharashtra','Nagpur'),('Maharashtra','Nashik'),('Maharashtra','Aurangabad'),('Maharashtra','Thane'),('Maharashtra','Navi Mumbai'),
('Manipur','Imphal'),('Manipur','Thoubal'),
('Meghalaya','Shillong'),('Meghalaya','Tura'),
('Mizoram','Aizawl'),('Mizoram','Lunglei'),
('Nagaland','Kohima'),('Nagaland','Dimapur'),
('Odisha','Bhubaneswar'),('Odisha','Cuttack'),('Odisha','Rourkela'),('Odisha','Berhampur'),('Odisha','Sambalpur'),
('Punjab','Ludhiana'),('Punjab','Amritsar'),('Punjab','Jalandhar'),('Punjab','Patiala'),('Punjab','Bathinda'),('Punjab','Mohali'),
('Rajasthan','Jaipur'),('Rajasthan','Jodhpur'),('Rajasthan','Kota'),('Rajasthan','Bikaner'),('Rajasthan','Ajmer'),('Rajasthan','Udaipur'),
('Sikkim','Gangtok'),('Sikkim','Namchi'),
('Tamil Nadu','Chennai'),('Tamil Nadu','Coimbatore'),('Tamil Nadu','Madurai'),('Tamil Nadu','Tiruchirappalli'),('Tamil Nadu','Salem'),('Tamil Nadu','Vellore'),
('Telangana','Hyderabad'),('Telangana','Warangal'),('Telangana','Nizamabad'),('Telangana','Karimnagar'),
('Tripura','Agartala'),('Tripura','Dharmanagar'),
('Uttar Pradesh','Lucknow'),('Uttar Pradesh','Kanpur'),('Uttar Pradesh','Agra'),('Uttar Pradesh','Varanasi'),('Uttar Pradesh','Prayagraj'),('Uttar Pradesh','Noida'),('Uttar Pradesh','Ghaziabad'),('Uttar Pradesh','Meerut'),('Uttar Pradesh','Greater Noida'),
('Uttarakhand','Dehradun'),('Uttarakhand','Haridwar'),('Uttarakhand','Rishikesh'),('Uttarakhand','Roorkee'),('Uttarakhand','Haldwani'),
('West Bengal','Kolkata'),('West Bengal','Howrah'),('West Bengal','Durgapur'),('West Bengal','Asansol'),('West Bengal','Siliguri'),('West Bengal','Kharagpur'),
('Andaman and Nicobar Islands','Port Blair'),
('Chandigarh','Chandigarh'),
('Dadra and Nagar Haveli','Silvassa'),
('Daman and Diu','Daman'),('Daman and Diu','Diu'),
('Delhi','New Delhi'),('Delhi','Delhi'),('Delhi','Dwarka'),('Delhi','Rohini'),
('Delhi NCR','Delhi'),('Delhi NCR','Noida'),('Delhi NCR','Greater Noida'),('Delhi NCR','Ghaziabad'),('Delhi NCR','Gurugram'),('Delhi NCR','Faridabad'),
('Jammu and Kashmir','Srinagar'),('Jammu and Kashmir','Jammu'),
('Ladakh','Leh'),('Ladakh','Kargil'),
('Lakshadweep','Kavaratti'),
('Puducherry','Puducherry'),('Puducherry','Karaikal');
