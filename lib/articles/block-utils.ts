import { createBlockId, type ArticleBlock } from "@/lib/articles/schema";
import { stripTags } from "@/lib/articles/renderer";

export const ADDABLE_BLOCK_TYPES: Array<{ type: ArticleBlock["type"]; label: string }> = [
  { type: "heading", label: "Heading" },
  { type: "paragraph", label: "Paragraph" },
  { type: "blockquote", label: "Quote" },
  { type: "icon_list", label: "Icon List" },
  { type: "comparison_table", label: "Comparison" },
  { type: "timeline", label: "Timeline" },
  { type: "testimonial", label: "Testimonial" },
  { type: "image", label: "Image" },
  { type: "takeaways", label: "Takeaways" },
  { type: "inline_cta", label: "Inline CTA" },
];

export function createDefaultBlock(type: ArticleBlock["type"]): ArticleBlock {
  switch (type) {
    case "heading":
      return { id: createBlockId("heading"), hidden: false, type: "heading", level: 2, text: "New Section" };
    case "paragraph":
      return { id: createBlockId("paragraph"), hidden: false, type: "paragraph", html: "New paragraph" };
    case "blockquote":
      return { id: createBlockId("quote"), hidden: false, type: "blockquote", text: "Important quote" };
    case "icon_list":
      return {
        id: createBlockId("icon"),
        hidden: false,
        type: "icon_list",
        columns: 2,
        items: [
          { icon: "check", title: "Benefit", text: "Describe the key benefit." },
          { icon: "star", title: "Result", text: "Describe the expected result." },
        ],
      };
    case "comparison_table":
      return {
        id: createBlockId("compare"),
        hidden: false,
        type: "comparison_table",
        ourBrand: "Our Formula",
        theirBrand: "Generic Brands",
        features: [{ name: "Lab Tested", us: true, them: false }],
      };
    case "timeline":
      return {
        id: createBlockId("timeline"),
        hidden: false,
        type: "timeline",
        title: "Your Journey",
        weeks: [{ week: 1, title: "Week 1", description: "Initial experience." }],
      };
    case "testimonial":
      return {
        id: createBlockId("testimonial"),
        hidden: false,
        type: "testimonial",
        helpedWith: "Overall Wellness",
        title: "I finally feel like myself",
        body: "Share the testimonial text here.",
        author: "Sarah K.",
        verified: true,
      };
    case "image":
      return {
        id: createBlockId("image"),
        hidden: false,
        type: "image",
        searchQuery: "relevant lifestyle photo",
        imageUrl: null,
        alt: null,
      };
    case "takeaways":
      return {
        id: createBlockId("takeaways"),
        hidden: false,
        type: "takeaways",
        items: [
          { title: "Key takeaway", content: "What should readers remember?" },
          { title: "Action", content: "What should readers do next?" },
        ],
      };
    case "inline_cta":
      return {
        id: createBlockId("cta"),
        hidden: false,
        type: "inline_cta",
        title: "Curious about the science?",
        buttonText: "Read the Clinical Study »",
        description: "Secure, verified link to official research.",
      };
    default: {
      const neverType: never = type;
      return neverType;
    }
  }
}

export function getBlockTypeLabel(type: ArticleBlock["type"]): string {
  const match = ADDABLE_BLOCK_TYPES.find((entry) => entry.type === type);
  return match ? match.label : type;
}

export function getBlockSummary(block: ArticleBlock): string {
  switch (block.type) {
    case "heading":
      return block.text || "Untitled heading";
    case "paragraph":
      return stripTags(block.html).slice(0, 80) || "Empty paragraph";
    case "blockquote":
      return block.text || "Empty quote";
    case "icon_list":
      return `${block.items.length} item${block.items.length === 1 ? "" : "s"}`;
    case "comparison_table":
      return `${block.features.length} feature${block.features.length === 1 ? "" : "s"}`;
    case "timeline":
      return `${block.weeks.length} week${block.weeks.length === 1 ? "" : "s"}`;
    case "testimonial":
      return block.title || block.author || "Testimonial";
    case "image":
      return block.searchQuery || "Image";
    case "takeaways":
      return `${block.items.length} takeaway${block.items.length === 1 ? "" : "s"}`;
    case "inline_cta":
      return block.title || "Inline CTA";
    default:
      return "";
  }
}
