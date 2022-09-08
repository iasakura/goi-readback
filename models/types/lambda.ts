export type Term =
  | { type: "var"; var: string }
  | { type: "app"; term1: Term; term2: Term }
  | { type: "lam"; var: string; body: Term };
