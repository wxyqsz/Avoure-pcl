import { Filter } from "bad-words";

const filter = new Filter();

// List of allowed content themes for your fashion blog
const allowedTopics = [
  "fashion",
  "beauty",
  "style",
  "makeup",
  "lifestyle",
  "shopping",
  "skincare",
  "outfit",
  "luxury",
  "trend"
];

// Main moderation function
interface BlogContent {
  title: string;
  content: string;
  category: string;
}

export function moderateBlogContent({ title, content, category }: BlogContent) {
  let status = "pending";
  let flagged = false;
  let flag_reason = null;

  const fullText = `${title} ${content} ${category}`.toLowerCase();

  // 1. Profanity check
  if (filter.isProfane(fullText)) {
    status = "rejected";
    flagged = true;
    flag_reason = "Profanity or inappropriate language detected.";
    return { status, flagged, flag_reason };
  }

  // 2. Relevance check (must include fashion-related keywords)
  const isRelevant = allowedTopics.some(keyword => fullText.includes(keyword));
  if (!isRelevant) {
    status = "rejected";
    flagged = true;
    flag_reason = "Content is not related to fashion, beauty, or lifestyle.";
    return { status, flagged, flag_reason };
  }

  // 3. Quality check (length must be decent)
  if (content.trim().length < 100) {
    status = "rejected";
    flagged = true;
    flag_reason = "Content too short or lacks substance.";
    return { status, flagged, flag_reason };
  }

  // All checks passed
  return { status, flagged, flag_reason };
}
