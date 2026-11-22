import type { MathfieldElement } from "mathlive";

type MathFieldProps = React.DetailedHTMLProps<
  React.HTMLAttributes<MathfieldElement>,
  MathfieldElement
> & {
  placeholder?: string;
  "math-virtual-keyboard-policy"?: "auto" | "manual" | "sandboxed";
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": MathFieldProps;
    }
  }
}
