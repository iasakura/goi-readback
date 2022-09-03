import { Term } from "../lambda";
import { parse } from "./gen/parser";

export const parseTerm = (s: string) => {
  return parse(s) as Term;
};
