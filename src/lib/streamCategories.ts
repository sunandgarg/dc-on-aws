// Master list of stream categories used across header (MegaMenu),
// homepage CategorySection and admin filters.
export const STREAM_CATEGORIES = [
  { id: "Engineering", label: "Engineering", emoji: "⚡" },
  { id: "Management", label: "Management", emoji: "📊" },
  { id: "Commerce and Banking", label: "Commerce & Banking", emoji: "💼" },
  { id: "Medical", label: "Medical", emoji: "🏥" },
  { id: "Science", label: "Science", emoji: "🔬" },
  { id: "Hotel Management", label: "Hotel Management", emoji: "🏨" },
  { id: "Information Technology", label: "Information Technology", emoji: "💻" },
  { id: "Arts & Humanities", label: "Arts & Humanities", emoji: "🎭" },
  { id: "Agriculture", label: "Agriculture", emoji: "🌾" },
  { id: "Law", label: "Law", emoji: "⚖️" },
  { id: "Pharmacy", label: "Pharmacy", emoji: "💊" },
  { id: "Education", label: "Education", emoji: "🎓" },
  { id: "Design", label: "Design", emoji: "🎨" },
] as const;

export type StreamCategory = (typeof STREAM_CATEGORIES)[number]["id"];
