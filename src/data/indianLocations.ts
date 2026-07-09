// Priority states surface at the top of every state filter / picker.
// "Delhi NCR" replaces standalone "Delhi" everywhere.
export const priorityStates = [
  "Delhi NCR", "Haryana", "Uttar Pradesh", "Punjab", "Uttarakhand", "Rajasthan",
];

const _restStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli",
  "Daman and Diu", "Jammu and Kashmir", "Ladakh",
  "Lakshadweep", "Puducherry",
].sort((a, b) => a.localeCompare(b));

export const indianStates = [...priorityStates, ..._restStates];

export const citiesByState: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Rajahmundry", "Kakinada", "Kadapa", "Anantapur", "Eluru", "Ongole", "Chittoor", "Srikakulam", "Vizianagaram", "Bhimavaram", "Narasaraopet", "Rajampet", "Tadepalligudem", "Nuzvid", "Rajam", "East Godavari", "West Godavari", "Prakasam", "Amaravati"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Tawang", "Ziro", "Pasighat", "Bomdila"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon", "Goalpara", "Golaghat", "Diphu", "Changsari"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Arrah", "Begusarai", "Katihar", "Munger", "Chapra", "Sasaram", "Hajipur", "Nalanda", "Bettiah", "Kishanganj", "Sitamarhi", "Saharsa", "Siwan", "Banka"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajnandgaon", "Jagdalpur", "Ambikapur", "Raigarh", "Bishrampur"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "South Goa", "Panjim"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh", "Anand", "Nadiad", "Morbi", "Mehsana", "Bharuch", "Navsari", "Bhuj", "Patan", "Vapi", "Valsad", "Godhra", "Himmatnagar", "Modasa", "Rajpipla", "Surendranagar", "Amreli", "Visnagar", "Vallabh Vidyanagar", "Sabarkantha", "Panchmahal", "Kutch District", "Banaskantha", "Adipur"],
  "Haryana": ["Gurugram", "Gurgaon", "Faridabad", "Panipat", "Ambala", "Karnal", "Hisar", "Rohtak", "Sonipat", "Sonepat", "Panchkula", "Yamunanagar", "Yamuna Nagar", "Bhiwani", "Sirsa", "Kurukshetra", "Jind", "Palwal", "Kaithal", "Rewari", "Narnaul", "Mahendragarh", "Jhajjar", "Mewat", "Bahadurgarh", "Murthal"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Dharamsala", "Mandi", "Solan", "Kullu", "Manali", "Hamirpur", "Kangra", "Una", "Baddi", "Palampur", "Sundernagar", "Sirmour", "Sirmaur", "Nadaun"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Bokaro Steel City", "Deoghar", "Hazaribagh", "Giridih", "Ramgarh", "Ghatsila", "Daltonganj", "Godda", "West Singhbhum"],
  "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum", "Gulbarga", "Kalaburagi", "Davangere", "Bellary", "Ballari", "Shimoga", "Tumkur", "Udupi", "Hassan", "Manipal", "Dharwad", "Bijapur", "Raichur", "Mandya", "Koppal", "Coorg", "Hubli-Dharwad", "Harihar", "Chikkamagaluru", "Chikballpura", "Ramanagara", "Gadag", "Moodbidri", "Chamarajanagar", "Hampi"],
  "Kerala": ["Thiruvananthapuram", "Trivandrum", "Kochi", "Kozhikode", "Calicut", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Alleppey", "Kannur", "Kottayam", "Malappuram", "Ernakulum", "Ernakulam", "Kasargode", "Pathanamthitta", "Idukki", "Wayanad", "Munnar", "Muvattupuzha", "Cherthala", "Kovalam"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Rewa", "Satna", "Dewas", "Ratlam", "Singrauli", "Vidisha", "Chhatarpur", "Shahdol", "Balaghat", "Damoh", "Khandwa", "Morena", "Guna", "Betul", "Datia", "Katni", "Chhindwara", "Jhabua"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Kolhapur", "Thane", "Navi Mumbai", "Amravati", "Sangli", "Jalgaon", "Akola", "Latur", "Ahmednagar", "Raigad", "Satara", "Ratnagiri", "Parbhani", "Wardha", "Chandrapur", "Nanded", "Yavatmal", "Dhule", "Jalna", "Washim", "Hingoli", "Baramati", "Ambajogai", "Shirpur-Warwade"],
  "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Churachandpur"],
  "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongstoin"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai", "Serchhip"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Brahmapur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Baripada", "Baripada Town", "Khurda", "Khordha", "Jajpur", "Keonjhar", "Koraput", "Rayagada", "Balangir", "Ganjam", "Mayurbhanj", "Dhenkanal", "Gunupur"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot", "Hoshiarpur", "Moga", "Phagwara", "Sangrur", "Rajpura", "Longowal", "Ferozpur", "Tarn Taran", "Gobindgarh", "Muktsar", "Faridkot", "Nawanshahar", "Derabassi", "Ropar", "Gurdaspur", "Sahibzada Ajit Singh Nagar", "Shahid Bhagat Singh Nagar", "Sirhind"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Alwar", "Bhilwara", "Sikar", "Sri Ganganagar", "Sriganaganagar", "Pali", "Tonk", "Bharatpur", "Jhunjhunu", "Jhalawar", "Banswara", "Barmer", "Hanumangarh", "Dungarpur", "Dausa", "Dholpur", "Pilani", "Neemrana"],
  "Sikkim": ["Gangtok", "Namchi", "Gyalshing", "Mangan", "Rangpo"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Erode", "Vellore", "Thoothukudi", "Thanjavur", "Dindigul", "Tirupur", "Kanchipuram", "Namakkal", "Virudhunagar", "Kanyakumari", "Cuddalore", "Dharmapuri", "Krishnagiri", "Villupuram", "Viluppuram", "Theni", "Karaikudi", "Karur", "Nagercoil", "Nagapattinam", "Sriperumbudur", "Thiruvarur", "Ooty", "Mettupalayam"],
  "Telangana": ["Hyderabad", "Secunderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam", "Mahbubnagar", "Nalgonda", "Adilabad", "Suryapet", "Ranga Reddy", "Medak", "Peddapalli", "Ghatkesar"],
  "Tripura": ["Agartala", "Dharmanagar", "Udaipur", "Kailashahar", "Ambassa"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Prayagraj", "Allahabad", "Meerut", "Noida", "Ghaziabad", "Bareilly", "Aligarh", "Moradabad", "Gorakhpur", "Mathura", "Jhansi", "Firozabad", "Greater Noida", "Saharanpur", "Muzaffarnagar", "Sitapur", "Unnao", "Barabanki", "Jaunpur", "Raebareli", "Orai", "Hapur", "Bulandshahr", "Gonda", "Faizabad", "Ayodhya", "Shahjahanpur", "Kannauj", "Amroha", "Modinagar", "Hardoi", "Pilibhit", "Sambhal", "Etawah", "Baghpat", "Sultanpur", "Azamgarh", "Shamli", "Tanda", "Vrindavan", "Mirzapur", "Farrukhabad", "Amethi", "Ambedkar Nagar", "Kaushambi"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh", "Roorkee", "Haldwani", "Kashipur", "Rudrapur", "Nainital", "Pithoragarh", "Ranikhet", "Kichha", "Gopeshwar (Chamoli)", "Srinagar Pauri Garhwal"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Malda", "Baharampur", "Murshidabad", "Kharagpur", "Kalyani", "Nadia", "Bankura", "Birbhum", "Hooghly", "Midnapore", "Purulia", "Jalpaiguri", "Darjeeling", "Haldia", "Coochbehar", "Cooch Behar", "Habra", "Suri", "Jhargram", "Dakshin Dinajpur", "Uttar Dinajpur", "Purba Bardhaman", "District 24 Parganas"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli": ["Silvassa"],
  "Daman and Diu": ["Daman", "Diu"],
  "Delhi NCR": ["Delhi", "New Delhi", "Dwarka", "Rohini", "Pitampura", "Janakpuri", "Laxmi Nagar", "Saket", "Noida", "Greater Noida", "Ghaziabad", "Gurgaon", "Gurugram", "Faridabad", "Meerut", "Sonipat"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Sopore", "Kathua", "Udhampur", "Pulwama"],
  "Ladakh": ["Leh", "Kargil"],
  "Lakshadweep": ["Kavaratti"],
  "Puducherry": ["Puducherry", "Pondicherry", "Karaikal", "Mahe", "Yanam"],
};

export const educationStatus = [
  "12th Appearing",
  "12th Passed",
  "Graduation",
  "Post Graduation",
  "Working Professional",
];

// Comprehensive filter data for listing pages

export const collegeStreams = [
  "Management", "Engineering", "IT and Software", "Medical", "Science",
  "Commerce", "Social Sciences", "Education", "Mass Communication",
  "Hotel Management", "Design", "Law", "Nursing", "Arts", "Architecture",
  "Finance", "Animation", "Beauty and Fitness", "Aviation",
  "Sports Management", "Data Science", "Business and Economics",
  "Computer Applications", "Computer Science", "Pharmacy",
  "Agriculture and Allied Sectors", "Fashion Design",
];

export const collegeTypes = [
  "Private", "Public/Government", "Private Institute", "Public-Private",
  "National", "Autonomous Institute", "Deemed", "State Institute",
];

export const collegeFeeRanges = [
  "Less than 1 Lakh", "1 - 2 Lakh", "2 - 3 Lakh", "3 - 5 Lakh",
  "5 - 7 Lakh", "7 - 10 Lakh", "15 - 20 Lakh", "20 - 25 Lakh", "Above 25 Lakh",
];

export const collegeCourseGroups = [
  "B.E. / B.Tech", "B.Sc.", "MBA/PGDM", "BBA", "BCA", "M.Sc.", "MCA",
  "B.Com", "M.E./M.Tech", "B.A.", "UG Diploma", "Diploma", "Certificate",
  "PG Diploma", "M.A.", "Ph.D.", "B.Pharma", "M.Com", "B.Ed",
  "LL.M.", "LL.B.", "MBBS", "B.Des", "B.Arch", "MD", "BDS",
  "GNM", "MSW", "BPT", "PGDM", "BHM", "M.Des", "BFA",
  "Executive MBA/PGDM", "B.J.M.C.", "MCA", "D.Pharma",
];

export const examCategories = [
  "Entrance", "Board", "Sarkari", "Study Abroad",
];

export const examStreams = [
  "Engineering", "Medical", "Law", "Management", "Design", "Science",
  "Arts", "Hotel Management", "Nursing", "IT and Software",
  "Architecture", "Aviation", "Education",
];

export const examCourseGroups = [
  "B.E. / B.Tech", "MBA/PGDM", "LL.B.", "M.E./M.Tech", "PGPM",
  "MBA", "MBBS", "MD", "A.M.E.",
];

export const examLevels = ["UG", "PG", "12th", "10th"];

export const courseStreams = [
  "Engineering", "Science", "Management", "Social Sciences", "Medical",
  "Commerce", "Design", "Education", "Hotel Management", "Arts",
  "IT and Software", "Law", "Mass Communication", "Finance", "Animation",
  "Nursing", "Architecture", "Beauty and Fitness", "Aviation",
  "Sports Management", "Data Science",
];

export const courseCourseGroups = [
  "B.E. / B.Tech", "B.Sc.", "Ph.D.", "M.Sc.", "MBA/PGDM", "B.A.",
  "M.E./M.Tech", "UG Diploma", "PG Diploma", "M.A.", "Certificate",
  "M.Tech", "BBA", "B.Com", "B.Tech", "MBA", "MD", "M.Phil",
  "After 10th Diploma", "B.Ed", "B.Sc(Hons.)", "M.Com", "Diploma",
  "LL.M.", "M.Pharma", "B.A. (Hons)", "MS", "B.Des", "BFA", "BCA",
  "PGDM", "B.Pharma", "LL.B.", "MCA", "Other",
];

export const courseSpecializations = [
  "Computer Science", "Mechanical Engineering", "Civil Engineering",
  "Electrical Engineering", "Electronics & Communication Engineering",
  "Chemical Engineering", "Information Technology", "Biotechnology",
  "Finance", "Marketing", "Human Resources", "Operations",
  "General Management", "International Business", "Business Analytics",
  "Data Science", "Artificial Intelligence", "Psychology", "Economics",
  "Political Science", "Sociology", "History", "English", "Mathematics",
  "Physics", "Chemistry", "Biology", "Fashion Design", "Interior Design",
  "Hotel / Hospitality Management", "Journalism", "Photography",
  "Pharmacy", "Nursing & Midwifery", "Public Health & Management",
];

export const courseModes = ["Full Time", "Part Time", "Online", "Distance"];

export const courseDurations = [
  "6 Months", "1 Year", "2 Years", "3 Years", "4 Years", "5 Years",
];

export const collegeExams = [
  "JEE Main", "GATE", "CAT", "NEET", "CMAT", "XAT", "CUET",
  "MHT CET", "KCET", "CLAT", "NATA", "COMEDK UGET", "WBJEE",
  "JEE Advanced", "BITSAT", "VITEEE", "SRMJEEE", "MAH MBA CET",
  "AP EAMCET", "OJEE", "IPU CET", "NIFT", "NID DAT", "SNAP",
];
