// Centralised cascading taxonomies for course & exam admin forms.

export const COURSE_GROUPS = ["UG", "PG", "Diploma", "Doctorate", "Certificate"] as const;

export const STREAMS_BY_GROUP: Record<string, string[]> = {
  UG: ["Engineering", "Medical", "Management", "Arts", "Commerce", "Science", "Law", "Design", "Agriculture"],
  PG: ["Engineering", "Medical", "Management", "Arts", "Commerce", "Science", "Law", "Design"],
  Diploma: ["Engineering", "Management", "Design", "Hotel Management"],
  Doctorate: ["Engineering", "Science", "Arts", "Management", "Medical"],
  Certificate: ["IT", "Management", "Design", "Language"],
};

export const SPECIALIZATIONS_BY_STREAM: Record<string, string[]> = {
  Engineering: ["Computer Science", "Mechanical", "Civil", "Electrical", "Electronics", "Chemical", "Aerospace", "Biotechnology", "AI/ML", "Data Science"],
  Medical: ["MBBS", "BDS", "BAMS", "BHMS", "Nursing", "Pharmacy", "Physiotherapy"],
  Management: ["Marketing", "Finance", "HR", "Operations", "International Business", "Analytics"],
  Arts: ["English", "History", "Political Science", "Psychology", "Sociology", "Economics"],
  Commerce: ["Accounting", "Finance", "Banking", "Taxation"],
  Science: ["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", "Statistics"],
  Law: ["Corporate Law", "Criminal Law", "Constitutional Law", "International Law"],
  Design: ["Fashion", "Graphic", "Interior", "UX/UI", "Industrial"],
  IT: ["Web Development", "Cloud", "Cybersecurity", "Data Science"],
};

export const STUDY_MODES = ["Full-Time", "Part-Time", "Online", "Distance", "Hybrid"];
export const DURATIONS = ["6 Months", "1 Year", "2 Years", "3 Years", "4 Years", "5 Years"];

// Exams
export const EXAM_CATEGORIES = ["Entrance", "Board", "Government", "Scholarship", "Olympiad", "International"];

export const EXAM_STREAMS_BY_CATEGORY: Record<string, string[]> = {
  Entrance: ["Engineering", "Medical", "Management", "Law", "Design", "Architecture", "Pharmacy", "Hotel Management"],
  Board: ["10th", "12th"],
  Government: ["UPSC", "SSC", "Banking", "Railway", "Defence"],
  Scholarship: ["NTSE", "KVPY", "INSPIRE"],
  Olympiad: ["Science", "Math", "English"],
  International: ["SAT", "GRE", "GMAT", "IELTS", "TOEFL"],
};

export const EXAM_LEVELS = ["National", "State", "University", "International"];
