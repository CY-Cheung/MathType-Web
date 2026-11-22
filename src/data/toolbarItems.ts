export type ToolbarItem = {
  id: string;
  label: string;
  latex: string;
  tooltip: string;
  shortcut?: string;
};

export type ToolbarPalette = {
  id: string;
  label: string;
  hint: string;
  icon?: string;
  items: ToolbarItem[];
};

function item(
  id: string,
  label: string,
  latex: string,
  tooltip: string,
  shortcut?: string,
): ToolbarItem {
  return { id, label, latex, tooltip, shortcut };
}

export function tooltipText(entry: ToolbarItem): string {
  return entry.shortcut ? `${entry.tooltip} (${entry.shortcut})` : entry.tooltip;
}

export const symbolPalettes: ToolbarPalette[] = [
  {
    id: "relations",
    label: "Relations",
    hint: "≤≥",
    items: [
      item("le", "≤", "\\le", "Less than or equal", "Ctrl+K, <"),
      item("ge", "≥", "\\ge", "Greater than or equal", "Ctrl+K, >"),
      item("neq", "≠", "\\neq", "Not equal", "Ctrl+K, ="),
      item("approx", "≈", "\\approx", "Approximately equal", "Ctrl+K, ~"),
      item("equiv", "≡", "\\equiv", "Identical to"),
      item("cong", "≅", "\\cong", "Congruent"),
      item("sim", "∼", "\\sim", "Similar"),
      item("propto", "∝", "\\propto", "Proportional to"),
    ],
  },
  {
    id: "spacing",
    label: "Spacing and ellipses",
    hint: "⋯",
    icon: "\\cdots",
    items: [
      item("thin", "‚", "\\,", "Thin space"),
      item("med", ":", "\\:", "Medium space"),
      item("thick", ";", "\\;", "Thick space"),
      item("quad", "␣", "\\quad", "Quad space"),
      item("dots", "…", "\\dots", "Dots"),
      item("cdots", "⋯", "\\cdots", "Centered dots"),
      item("vdots", "⋮", "\\vdots", "Vertical dots"),
      item("ddots", "⋱", "\\ddots", "Diagonal dots"),
    ],
  },
  {
    id: "accents",
    label: "Accents",
    hint: "x̂",
    icon: "\\hat{x}",
    items: [
      item("prime", "′", "\\prime", "Prime"),
      item("vec", "x⃗", "\\vec{#@}", "Vector"),
      item("hat", "x̂", "\\hat{#@}", "Hat"),
      item("bar", "x̄", "\\bar{#@}", "Bar"),
      item("dot", "ẋ", "\\dot{#@}", "Dot"),
      item("ddot", "ẍ", "\\ddot{#@}", "Double dot"),
    ],
  },
  {
    id: "operators",
    label: "Operators",
    hint: "±×",
    items: [
      item("pm", "±", "\\pm", "Plus or minus", "Ctrl+K, +"),
      item("mp", "∓", "\\mp", "Minus or plus", "Ctrl+K, -"),
      item("times", "×", "\\times", "Times", "Ctrl+K, t"),
      item("div", "÷", "\\div", "Divided by"),
      item("cdot", "·", "\\cdot", "Dot", "Ctrl+K, ."),
      item("circ", "∘", "\\circ", "Circle"),
      item("otimes", "⊗", "\\otimes", "Tensor product"),
      item("oplus", "⊕", "\\oplus", "Direct sum"),
    ],
  },
  {
    id: "arrows",
    label: "Arrows",
    hint: "→",
    items: [
      item("to", "→", "\\to", "Right arrow"),
      item("leftarrow", "←", "\\leftarrow", "Left arrow"),
      item("Leftrightarrow", "⇔", "\\Leftrightarrow", "If and only if"),
      item("Rightarrow", "⇒", "\\Rightarrow", "Implies"),
      item("mapsto", "↦", "\\mapsto", "Maps to"),
      item("downarrow", "↓", "\\downarrow", "Down arrow"),
    ],
  },
  {
    id: "logic",
    label: "Logic and deduction",
    hint: "∴",
    items: [
      item("because", "∵", "\\because", "Because"),
      item("therefore", "∴", "\\therefore", "Therefore"),
      item("forall", "∀", "\\forall", "For all"),
      item("exists", "∃", "\\exists", "There exists"),
      item("neg", "¬", "\\neg", "Not"),
      item("land", "∧", "\\land", "And"),
      item("lor", "∨", "\\lor", "Or"),
    ],
  },
  {
    id: "sets",
    label: "Set theory",
    hint: "∈",
    items: [
      item("in", "∈", "\\in", "Element of"),
      item("notin", "∉", "\\notin", "Not an element of"),
      item("cap", "∩", "\\cap", "Intersection"),
      item("cup", "∪", "\\cup", "Union"),
      item("subset", "⊂", "\\subset", "Subset"),
      item("subseteq", "⊆", "\\subseteq", "Subset or equal"),
      item("emptyset", "∅", "\\emptyset", "Empty set"),
    ],
  },
  {
    id: "symbols",
    label: "Other symbols",
    hint: "∞∂",
    items: [
      item("partial", "∂", "\\partial", "Partial derivative", "Ctrl+K, d"),
      item("infty", "∞", "\\infty", "Infinity", "Ctrl+K, i"),
      item("ell", "ℓ", "\\ell", "Script l"),
      item("nabla", "∇", "\\nabla", "Nabla"),
      item("angle", "∠", "\\angle", "Angle"),
      item("perp", "⊥", "\\perp", "Perpendicular"),
      item("parallel", "∥", "\\parallel", "Parallel"),
      item("triangle", "△", "\\triangle", "Triangle"),
    ],
  },
  {
    id: "greek-lower",
    label: "Greek",
    hint: "αβ",
    items: [
      item("alpha", "α", "\\alpha", "Alpha", "Ctrl+G, a"),
      item("beta", "β", "\\beta", "Beta", "Ctrl+G, b"),
      item("gamma", "γ", "\\gamma", "Gamma", "Ctrl+G, g"),
      item("delta", "δ", "\\delta", "Delta", "Ctrl+G, d"),
      item("epsilon", "ε", "\\epsilon", "Epsilon"),
      item("theta", "θ", "\\theta", "Theta", "Ctrl+G, q"),
      item("lambda", "λ", "\\lambda", "Lambda", "Ctrl+G, l"),
      item("mu", "μ", "\\mu", "Mu"),
      item("pi", "π", "\\pi", "Pi", "Ctrl+G, p"),
      item("sigma", "σ", "\\sigma", "Sigma", "Ctrl+G, s"),
      item("phi", "φ", "\\phi", "Phi", "Ctrl+G, f"),
      item("omega", "ω", "\\omega", "Omega", "Ctrl+G, w"),
    ],
  },
  {
    id: "greek-upper",
    label: "Greek capitals",
    hint: "ΓΔ",
    items: [
      item("Gamma", "Γ", "\\Gamma", "Capital gamma", "Ctrl+G, Shift+G"),
      item("Delta", "Δ", "\\Delta", "Capital delta", "Ctrl+G, Shift+D"),
      item("Theta", "Θ", "\\Theta", "Capital theta", "Ctrl+G, Shift+Q"),
      item("Lambda", "Λ", "\\Lambda", "Capital lambda", "Ctrl+G, Shift+L"),
      item("Pi", "Π", "\\Pi", "Capital pi", "Ctrl+G, Shift+P"),
      item("Sigma", "Σ", "\\Sigma", "Capital sigma", "Ctrl+G, Shift+S"),
      item("Phi", "Φ", "\\Phi", "Capital phi", "Ctrl+G, Shift+F"),
      item("Omega", "Ω", "\\Omega", "Capital omega", "Ctrl+G, Shift+W"),
    ],
  },
];

export const templatePalettes: ToolbarPalette[] = [
  {
    id: "fences",
    label: "Fences",
    hint: "( )",
    icon: "(x)",
    items: [
      item("parens", "( )", "\\left(#@\\right)", "Parentheses", "Ctrl+9"),
      item("brackets", "[ ]", "\\left[#@\\right]", "Brackets", "Ctrl+["),
      item("braces", "{ }", "\\left\\{#@\\right\\}", "Braces", "Ctrl+Shift+["),
      item("abs", "| |", "\\left|#@\\right|", "Absolute value", "Alt+T, |"),
    ],
  },
  {
    id: "fractions",
    label: "Fractions and radicals",
    hint: "a/b",
    icon: "\\frac{a}{b}",
    items: [
      item("frac", "a/b", "\\frac{#@}{#?}", "Fraction", "Ctrl+F"),
      item("slant", "a⁄b", "#@/#?", "Slanted fraction"),
      item("sqrt", "√", "\\sqrt{#@}", "Square root", "Ctrl+R"),
      item("nthroot", "ⁿ√", "\\sqrt[#?]{#@}", "nth root", "Alt+T, N"),
    ],
  },
  {
    id: "scripts",
    label: "Scripts",
    hint: "x²",
    icon: "x^{2}",
    items: [
      item("sup", "x²", "^{#@}", "Superscript", "Ctrl+H"),
      item("sub", "x₂", "_{#@}", "Subscript", "Ctrl+L"),
      item("subsup", "x₂²", "_{#@}^{#?}", "Subscript and superscript", "Ctrl+J"),
    ],
  },
  {
    id: "sums",
    label: "Sums",
    hint: "Σ",
    items: [
      item("sum", "Σ", "\\sum_{#?}^{#?}#@", "Summation", "Alt+T, S"),
      item("sum-sub", "Σₙ", "\\sum_{#?}#@", "Summation with lower limit"),
    ],
  },
  {
    id: "integrals",
    label: "Integrals",
    hint: "∫",
    icon: "\\int_{#?}^{#?}#@",
    items: [
      item("int", "∫", "\\int #@", "Indefinite integral"),
      item("defint", "∫ₐᵇ", "\\int_{#?}^{#?}#@", "Definite integral", "Ctrl+I"),
      item("iint", "∬", "\\iint_{#?}#@", "Double integral"),
    ],
  },
  {
    id: "lines",
    label: "Over and under lines",
    hint: "x̄",
    icon: "\\overline{x}",
    items: [
      item("overline", "x̄", "\\overline{#@}", "Overline"),
      item("underline", "x̱", "\\underline{#@}", "Underline"),
    ],
  },
  {
    id: "arrow-accents",
    label: "Accent arrows",
    hint: "→",
    icon: "\\overrightarrow{x}",
    items: [
      item("overrightarrow", "x→", "\\overrightarrow{#@}", "Right arrow over"),
      item("xrightarrow", "→", "\\xrightarrow{#?}", "Labeled right arrow"),
    ],
  },
  {
    id: "products",
    label: "Products and set operators",
    hint: "Π",
    items: [
      item("prod", "Π", "\\prod_{#?}^{#?}#@", "Product", "Alt+T, P"),
      item("bigcup", "⋃", "\\bigcup_{#?}^{#?}#@", "Big union"),
      item("bigcap", "⋂", "\\bigcap_{#?}^{#?}#@", "Big intersection"),
    ],
  },
  {
    id: "matrices",
    label: "Matrices",
    hint: "2×2",
    icon: "\\begin{smallmatrix}a&b\\\\c&d\\end{smallmatrix}",
    items: [
      item(
        "matrix2",
        "2×2",
        "\\begin{pmatrix}#?&#?\\\\#?&#?\\end{pmatrix}",
        "2 by 2 matrix",
      ),
      item(
        "matrix3",
        "3×3",
        "\\begin{pmatrix}#?&#?&#?\\\\#?&#?&#?\\\\#?&#?&#?\\end{pmatrix}",
        "3 by 3 matrix",
      ),
    ],
  },
  {
    id: "box",
    label: "Box",
    hint: "□",
    icon: "\\boxed{x}",
    items: [item("boxed", "□", "\\boxed{#@}", "Boxed")],
  },
];
