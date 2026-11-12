export type TikzBackend = "auto" | "wasm" | "system";
export type MathOutput = "html" | "mathml";

export interface BookConfig {
  title: string;
  subtitle: string;
  author: string;
  publisher: string;
  edition: string;
  language: string;
  description: string;
  isbn?: string;

  manuscriptDir: string;
  designDir: string;
  distDir: string;
  cacheDir: string;

  page: {
    size: "A4" | "Letter" | "6x9" | "7x9.1875";
    width: string;
    height: string;
    margin: string;
  };

  math: {
    macros: Record<string, string>;
  };

  tikz: {
    backend: TikzBackend;
    packages: string[];
    libraries: string[];
  };

  pdf: {
    paged: boolean;
    printBackground: boolean;
  };

  epub: {
    cover?: string;
  };

  outputs: {
    html: boolean;
    pdf: boolean;
    epub: boolean;
  };
}

const config: BookConfig = {
  title: "Just Competitive Programmers",
  subtitle: "A Practical Guide to Algorithms and Problem Solving",
  author: "Arihant Jain",
  publisher: "Self-published",
  edition: "First Edition",
  language: "en",
  description:
    "A chapter-wise handbook of competitive programming techniques, data structures, and algorithms.",

  manuscriptDir: "manuscript",
  designDir: "design",
  distDir: "dist",
  cacheDir: ".cache",

  page: {
    size: "7x9.1875",
    width: "7in",
    height: "9.1875in",
    margin: "22mm 20mm 24mm",
  },

  math: {
    macros: {
      "\\N": "\\mathbb{N}",
      "\\Z": "\\mathbb{Z}",
      "\\R": "\\mathbb{R}",
      "\\C": "\\mathbb{C}",
      "\\eps": "\\varepsilon",
      "\\bigO": "\\mathcal{O}",
      "\\dp": "\\operatorname{dp}",
      "\\dist": "\\operatorname{dist}",
      "\\argmax": "\\operatorname*{arg\\,max}",
      "\\argmin": "\\operatorname*{arg\\,min}",
      "\\mod": "\\operatorname{mod}",
      "\\gcd": "\\operatorname{gcd}",
    },
  },

  tikz: {
    backend: "auto",
    packages: ["amsmath", "amssymb", "tikz-cd", "pgfplots", "circuitikz"],
    libraries: [
      "arrows.meta",
      "calc",
      "positioning",
      "shapes.geometric",
      "decorations.pathreplacing",
    ],
  },

  pdf: {
    paged: true,
    printBackground: true,
  },

  epub: {},

  outputs: {
    html: true,
    pdf: true,
    epub: true,
  },
};

export default config;
