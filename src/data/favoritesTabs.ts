export type FavoriteSize = "large" | "small";

export type FavoriteItem = {
  id: string;
  latex: string;
  size: FavoriteSize;
};

export type FavoriteTab = {
  id: string;
  label: string;
  items: FavoriteItem[];
};

function entry(id: string, latex: string, size: FavoriteSize = "large"): FavoriteItem {
  return { id, latex, size };
}

export const FAVORITE_TABS: FavoriteTab[] = [
  {
    id: "algebra",
    label: "Algebra",
    items: [
      entry("alg-pyth", "\\sqrt{a^2+b^2}"),
      entry("alg-lim", "\\lim_{x\\to\\infty}"),
      entry("alg-disc", "\\sqrt{b^2-4ac}"),
      entry("alg-quad", "\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}"),
      entry("alg-comb", "\\frac{n!}{r!(n-r)!}"),
      entry("alg-half", "\\frac{1}{2}"),
      entry("alg-z", "\\mathbb{Z}", "small"),
      entry("alg-k", "\\mathbb{k}", "small"),
      entry("alg-f", "\\mathbb{F}", "small"),
      entry("alg-s", "\\mathbb{S}", "small"),
      entry("alg-fraka", "\\mathfrak{A}", "small"),
      entry("alg-frakm", "\\mathfrak{M}", "small"),
      entry("alg-otimes", "\\otimes", "small"),
      entry("alg-oplus", "\\oplus", "small"),
      entry("alg-left", "\\triangleleft", "small"),
      entry("alg-right", "\\triangleright", "small"),
      entry("alg-unit", "[0,1]", "small"),
      entry("alg-inf", "\\infty", "small"),
      entry("alg-sqrt2", "\\sqrt{2}", "small"),
    ],
  },
  {
    id: "derivs",
    label: "Derivs",
    items: [
      entry("der-d", "\\frac{d}{dx}"),
      entry("der-partial", "\\frac{\\partial}{\\partial x}"),
      entry("der-dy", "\\frac{dy}{dx}"),
      entry("der-prime", "f'(x)"),
      entry("der-int", "\\int f(x)\\,dx"),
    ],
  },
  {
    id: "statistics",
    label: "Statistics",
    items: [
      entry("stat-bar", "\\bar{x}"),
      entry("stat-binom", "\\binom{n}{k}"),
      entry("stat-var", "\\sigma^2"),
      entry("stat-sum", "\\sum_{i=1}^{n}x_i"),
      entry("stat-cond", "P(A\\mid B)"),
    ],
  },
  {
    id: "matrices",
    label: "Matrices",
    items: [
      entry("mat-det", "\\det(A)"),
      entry("mat-inv", "A^{-1}"),
      entry("mat-2", "\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}"),
      entry("mat-vec", "\\vec{v}"),
    ],
  },
  {
    id: "sets",
    label: "Sets",
    items: [
      entry("set-cup", "A\\cup B"),
      entry("set-cap", "A\\cap B"),
      entry("set-sub", "A\\subseteq B"),
      entry("set-empty", "\\emptyset"),
      entry("set-card", "|A|"),
    ],
  },
  {
    id: "trig",
    label: "Trig",
    items: [
      entry("trig-id", "\\sin^2\\theta+\\cos^2\\theta=1"),
      entry("trig-tan", "\\tan\\theta"),
      entry("trig-sum", "\\sin(A+B)"),
      entry("trig-double", "\\cos 2\\theta"),
      entry("trig-ratio", "\\frac{\\sin\\theta}{\\cos\\theta}"),
    ],
  },
  {
    id: "geometry",
    label: "Geometry",
    items: [
      entry("geo-area", "\\pi r^2"),
      entry("geo-tri", "\\frac{1}{2}bh"),
      entry("geo-pyth", "a^2+b^2=c^2"),
      entry("geo-circ", "2\\pi r"),
      entry("geo-angle", "\\angle ABC"),
    ],
  },
  { id: "tab8", label: "Tab 8", items: [] },
  { id: "tab9", label: "Tab 9", items: [] },
];

export function cloneFavoriteTabs(): FavoriteTab[] {
  return FAVORITE_TABS.map((tab) => ({
    ...tab,
    items: tab.items.map((item) => ({ ...item })),
  }));
}
