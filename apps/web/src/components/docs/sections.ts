/** Single source of truth for the docs page's section ids — the sidebar, the
 * mobile TOC, and the content sections all render from this list. */
export const DOCS_SECTIONS = [
  { id: "overview", number: "01", label: "Overview" },
  { id: "how-it-works", number: "02", label: "How it works" },
  { id: "use-cases", number: "03", label: "Use cases" },
  { id: "live-today", number: "04", label: "Live today" },
  { id: "workflow", number: "05", label: "Sample workflow" },
  { id: "roadmap", number: "06", label: "Roadmap" },
  { id: "reference", number: "07", label: "Reference" },
] as const;

export type DocsSectionId = (typeof DOCS_SECTIONS)[number]["id"];
