// Shared types for all data models
export interface College {
  slug: string;
  name: string;
  shortName: string;
  location: string;
  state: string;
  type: "Government" | "Private" | "Deemed" | "Autonomous";
  category: string;
  rating: number;
  reviews: number;
  courses: number;
  fees: string;
  placement: string;
  ranking: string;
  image: string;
  tags: string[];
  established: number;
  description: string;
  highlights: string[];
  facilities: string[];
  approvals: string[];
  naacGrade: string;
}

export interface Course {
  slug: string;
  name: string;
  fullName: string;
  category: string;
  duration: string;
  level: "Undergraduate" | "Postgraduate" | "Diploma" | "Doctoral";
  colleges: number;
  avgFees: string;
  avgSalary: string;
  growth: string;
  description: string;
  eligibility: string;
  topExams: string[];
  careers: string[];
  subjects: string[];
  image: string;
  mode: string;
  specializations: string[];
}

export interface Exam {
  slug: string;
  name: string;
  fullName: string;
  category: string;
  level: "National" | "State" | "University" | "International" | "Professional";
  date: string;
  applicants: string;
  eligibility: string;
  mode: string;
  description: string;
  importantDates: { event: string; date: string }[];
  syllabus: string[];
  topColleges: string[];
  image: string;
  registrationUrl: string;
  duration: string;
  examType: string;
  language: string;
  frequency: string;
  applicationMode: string;
  status: "Upcoming" | "Applications Open" | "Applications Closed" | "Exam Over";
}

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  authorAvatar: string;
  publishedAt: string;
  readTime: string;
  image: string;
  tags: string[];
  content: string;
}
