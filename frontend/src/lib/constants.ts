export const CATEGORIES = [
  { id: "canon", label: "Canon", color: "bg-burgundy text-cream" },
  { id: "articles", label: "Articles", color: "bg-saffron text-cream" },
  { id: "av", label: "Audio/Video", color: "bg-sage text-cream" },
  { id: "booklets", label: "Booklets", color: "bg-lotus text-cream" },
  { id: "essays", label: "Essays", color: "bg-saffron-dark text-cream" },
  { id: "monographs", label: "Monographs", color: "bg-burgundy-light text-cream" },
  { id: "papers", label: "Papers", color: "bg-dharma-gold text-cream" },
  { id: "excerpts", label: "Excerpts", color: "bg-sage-light text-cream" },
  { id: "reference", label: "Reference", color: "bg-fg-subtle text-cream" },
] as const;

export const POPULAR_TOPICS = [
  "meditation",
  "mindfulness",
  "dependent origination",
  "four noble truths",
  "nibbana",
  "metta",
  "impermanence",
  "karma",
  "vipassana",
  "eightfold path",
];

export function getCategoryMeta(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? { id, label: id, color: "bg-fg-subtle text-cream" };
}
