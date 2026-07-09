/**
 * Default fallback FAQs (SEO/GEO-optimized) for college/course/exam pages.
 * Used when no item-specific FAQ rows exist in the database.
 */

export type FaqEntityType = "college" | "course" | "exam";

interface FaqEntity {
  name: string;
  location?: string;
  fees?: string;
  placement?: string;
  established?: number | string;
  duration?: string;
  eligibility?: string;
  exam_date?: string;
  conducting_body?: string;
}

export interface DefaultFaq { question: string; answer: string; }

export function buildDefaultFaqs(type: FaqEntityType, e: FaqEntity): DefaultFaq[] {
  const n = e.name;
  if (type === "college") {
    return [
      { question: `Is ${n} a good college?`, answer: `${n} is a sought-after institution known for strong academics, modern infrastructure${e.placement ? `, and an average placement package of ${e.placement}` : ""}. Latest NIRF and NAAC ratings reinforce its reputation among students and recruiters.` },
      { question: `What are the latest admission dates and process for ${n}?`, answer: `Admissions to ${n} follow a merit + entrance-based process. Applications typically open between February and June each year. Visit the official admissions page or apply through DekhoCampus for guided counselling.` },
      { question: `What is the fee structure of ${n}?`, answer: `${e.fees ? `The current fees at ${n} are approximately ${e.fees} per year, ` : `Fees at ${n} vary by program; `}scholarships and education loans are available for eligible candidates.` },
      { question: `What is the average placement package at ${n}?`, answer: `${e.placement ? `${n} reported an average package of ${e.placement} in the latest placement season, ` : `${n} has a strong placement record with `}top recruiters from IT, consulting, finance and core engineering sectors.` },
      { question: `Where is ${n} located and how is the campus life?`, answer: `${n}${e.location ? ` is located in ${e.location}` : ""} and offers a vibrant campus life with hostels, sports facilities, clubs, and modern academic infrastructure.` },
      { question: `Is ${n} recognized by UGC / AICTE / NAAC?`, answer: `Yes, ${n} carries the relevant statutory approvals (UGC / AICTE / NAAC, where applicable) and its degrees are recognized across India and abroad.` },
      { question: `How can I get free counselling for ${n}?`, answer: `Click "Get Free Counselling" on this page. A DekhoCampus expert will reach out within 24 hours to help with eligibility, fees, scholarships, and the application process.` },
    ];
  }
  if (type === "course") {
    return [
      { question: `What is ${n} and is it worth pursuing?`, answer: `${n} is a high-demand program with strong industry relevance${e.duration ? ` and a typical duration of ${e.duration}` : ""}. Career outcomes have improved year-over-year, making it a future-ready choice.` },
      { question: `What is the eligibility for ${n}?`, answer: `${e.eligibility ? `Eligibility for ${n}: ${e.eligibility}.` : `Eligibility for ${n} typically includes Class 12 / a relevant bachelor's degree from a recognized board, depending on the level of the program.`} Specific cut-offs vary by college.` },
      { question: `What are the average fees for ${n} in India?`, answer: `${e.fees ? `The average fees for ${n} are around ${e.fees}.` : `Fees for ${n} vary by college and category - government colleges are far more affordable than private ones.`} Scholarships and education loans are widely available.` },
      { question: `What jobs and salary can I expect after ${n}?`, answer: `Graduates of ${n} are hired across IT, consulting, research, public sector and core domains. Entry-level salaries typically range from ₹3.5 LPA to ₹12 LPA depending on the college and skill profile.` },
      { question: `Which are the top colleges offering ${n}?`, answer: `Top colleges offering ${n} include IITs, NITs, IIITs, central universities and leading private institutions. Use DekhoCampus filters to compare colleges by fees, placements and location.` },
      { question: `Is ${n} better than its alternatives?`, answer: `${n} stands out due to its updated curriculum, industry tie-ups and strong demand. The right choice depends on your interests, budget and target career path - talk to a counsellor for a personalised match.` },
    ];
  }
  // exam
  return [
    { question: `When will ${n} be conducted?`, answer: `${e.exam_date ? `${n} is scheduled around ${e.exam_date}.` : `${n} dates are announced by ${e.conducting_body || "the conducting authority"} a few months before the exam.`} Always confirm on the official notification.` },
    { question: `What is the eligibility criteria for ${n}?`, answer: `${e.eligibility ? `Eligibility for ${n}: ${e.eligibility}.` : `Eligibility for ${n} generally includes age, nationality and qualifying-degree requirements as defined by ${e.conducting_body || "the conducting authority"}.`}` },
    { question: `What is the syllabus and exam pattern for ${n}?`, answer: `The ${n} syllabus and pattern follow the latest official notification, with sectional cut-offs and a defined marking scheme. Prepare from updated NCERT/standard reference books and previous-year papers.` },
    { question: `What is a good score / rank in ${n} for top colleges?`, answer: `A competitive ${n} score is needed for top colleges - exact cut-offs vary year-to-year. Compare last 3 years' cut-offs on DekhoCampus before shortlisting.` },
    { question: `How can I apply for ${n}?`, answer: `Apply online on the official ${n} portal during the application window. Keep your photo, signature, ID proof and academic documents ready in the prescribed format.` },
    { question: `What are the best colleges accepting ${n} score?`, answer: `Hundreds of top colleges across India accept the ${n} score for admission. Use DekhoCampus to filter colleges by your expected rank, location and fees budget.` },
    { question: `How can DekhoCampus help me with ${n} preparation and admissions?`, answer: `DekhoCampus offers free expert counselling, college predictor tools, scholarship guidance and end-to-end admission support for ${n} aspirants. Click "Get Free Counselling" to start.` },
  ];
}
