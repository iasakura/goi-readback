import * as uuid from "uuid";
import { Term } from "./lambda";

const unreachable = () => {
  throw Error("unreachable");
};

export type Edge = { links: Link[]; id: string };

const other = (self: Link, e: Edge) => {
  return e.links.find((l) => l.id != self.id);
};

const newEdge = (): Edge => ({ links: [], id: uuid.v4() });

export type AbstractLink = {
  type: string;
  auxiliary: () => { [k in string]: Edge };
  principal: () => Edge;
  id: string;
};

export type Link = Lam | App | Croissant | Bracket | Sharing;

export type Lam = {
  type: "lam";
  auxiliary: () => { param: Edge; body: Edge };
  principal: () => Edge;
  id: string;
};

export const lam = (param: Edge, body: Edge) => {
  const principal = newEdge();
  const lam: Lam = {
    type: "lam",
    auxiliary: () => ({
      param,
      body,
    }),
    principal: () => principal,
    id: uuid.v4(),
  };
  principal.links.push(lam);
  param.links.push(lam);
  body.links.push(lam);

  return lam;
};

export type App = {
  type: "app";
  auxiliary: () => { cont: Edge; arg: Edge };
  principal: () => Edge;
  id: string;
};

export const app = (func: Edge, arg: Edge) => {
  const cont = newEdge();
  const app: App = {
    type: "app" as const,
    auxiliary: () => ({ cont, arg }),
    principal: () => func,
    id: uuid.v4(),
  };
  cont.links.push(app);
  func.links.push(app);
  arg.links.push(app);

  return app;
};

export type Croissant = {
  type: "croissant";
  name: string;
  auxiliary: () => { aux: Edge };
  principal: () => Edge;
  id: string;
};

export const croissant = (auxiliary: Edge, name: string): Croissant => {
  const principal = newEdge();
  const croissant: Croissant = {
    type: "croissant",
    name,
    auxiliary: () => ({
      aux: auxiliary,
    }),
    principal: () => principal ?? unreachable(),
    id: uuid.v4(),
  };
  auxiliary.links.push(croissant);
  principal.links.push(croissant);
  return croissant;
};

export type Bracket = {
  type: "bracket";
  auxiliary: () => { aux: Edge };
  principal: () => Edge;
  id: string;
};

export const bracket = (auxiliary: Edge): Bracket => {
  const principal = newEdge();
  const bracket: Bracket = {
    type: "bracket",
    auxiliary: () => ({ aux: auxiliary }),
    principal: () => principal ?? unreachable(),
    id: uuid.v4(),
  };
  auxiliary.links.push(bracket);
  principal.links.push(bracket);
  return bracket;
};

export type Sharing = {
  type: "sharing";
  auxiliary: () => { left: Edge; right: Edge };
  principal: () => Edge;
  id: string;
};

export const sharing = (left: Edge, right: Edge) => {
  const principal = newEdge();
  const sharing: Sharing = {
    type: "sharing",
    auxiliary: () => ({ left, right }),
    principal: () => principal ?? unreachable(),
    id: uuid.v4(),
  };
  principal.links.push(sharing);
  left.links.push(sharing);
  right.links.push(sharing);

  return sharing;
};

export type Weakening = {
  type: "weakening";
  auxiliary: () => {};
  principal: () => Edge;
  id: string;
};

export const weakening = (principal: Edge) => {
  return {
    type: "weakening",
    auxiliary: () => ({}),
    principal: () => principal,
    id: uuid.v4(),
  };
};

export type Graph = {
  root: Edge;
  freeVars: { [k in string]: Edge };
  boxes: Box[];
};
export type Box = { principal: Edge; auxiliaries: Edge[] };

export const termToGraph = (t: Term): Graph => {
  if (t.type === "var") {
    const root = newEdge();
    const c = croissant(root, t.var);
    const freeVars = { [t.var]: c.principal() };

    return { root: c.auxiliary().aux, freeVars, boxes: [] };
  } else if (t.type === "lam") {
    const graph = termToGraph(t.body);
    if (t.var in graph.freeVars) {
      const l = lam(graph.freeVars[t.var], graph.root);
      delete graph.freeVars[t.var];
      return {
        root: l.principal(),
        freeVars: graph.freeVars,
        boxes: graph.boxes,
      };
    } else {
      const edge = newEdge();
      const w = weakening(edge);
      const l = lam(w.principal(), graph.root);
      return {
        root: l.principal(),
        freeVars: graph.freeVars,
        boxes: graph.boxes,
      };
    }
  } else if (t.type === "app") {
    const funcGraph = termToGraph(t.term1);
    const argGraph = termToGraph(t.term2);

    const a = app(funcGraph.root, argGraph.root);

    const freeVars: { [k in string]: Edge } = {};
    Object.keys(funcGraph.freeVars).forEach((key) => {
      if (key in argGraph.freeVars) {
        const funcEdge = funcGraph.freeVars[key];
        const argEdge = argGraph.freeVars[key];

        freeVars[key] = sharing(funcEdge, argEdge).principal();
      } else {
        freeVars[key] = funcGraph.freeVars[key];
      }
    });
    Object.keys(argGraph.freeVars).forEach((key) => {
      if (!(key in funcGraph.freeVars)) {
        freeVars[key] = argGraph.freeVars[key];
      }
    });

    const newBox = {
      principal: argGraph.root,
      auxiliaries: Object.values(argGraph.freeVars),
    };

    return {
      root: a.auxiliary().cont,
      freeVars,
      boxes: [newBox, ...funcGraph.boxes, ...argGraph.boxes],
    };
  } else {
    // unreachable
    return t;
  }
};

const linkNameToString = (link: Link): string => {
  const op = link.type;
  if (op === "app") {
    return "@";
  } else if (op === "lam") {
    return "λ";
  } else if (op === "croissant") {
    return `🥐${link.name}`;
  } else if (op === "sharing") {
    return "▽";
  } else if (op === "bracket") {
    return "[";
  } else if (op === "weakening") {
    return "w";
  } else {
    return op;
  }
};

// export type Label = "0" | "1" | "p" | "q" | "r" | "s" | "t" | "d";

// const getIndexOfEdgeInPrem = (from: Link, to: Link): number => {
//   const res = Object.entries(to.auxiliary()).find(
//     ([key, e]) => e.from.id === from.id
//   );
//   if (res < 0) {
//     throw Error("Cannot find from");
//   }
//   return res;
// };

// const labelOfEdge = (name: string, edge: Edge, boxes: Box[]): Label[] => {
//   if (edge.links.length !== 2) {
//     throw Error("Conclusion");
//   }
//   const [from, to] = edge.links;
//   const labels: Label[] = [];
//   if (
//     boxes.find(
//       (box) =>
//         !!box.auxiliaries.find(
//           (edge) => edge.from.id === from.id && edge.to?.id === to.id
//         )
//     )
//   ) {
//     labels.push("t");
//   }

//   if (to.name === "app" || to.name === "lam") {
//     if (getIndexOfEdgeInPrem(from, to) === 0) {
//       labels.push("p");
//     } else {
//       labels.push("q");
//     }
//   } else if (to.name === "sharing") {
//     if (getIndexOfEdgeInPrem(from, to) === 0) {
//       labels.push("r");
//     } else {
//       labels.push("s");
//     }
//   } else if (to.name === "crossant") {
//     labels.push("d");
//   } else if (to.name === "weakening") {
//     labels.push("0");
//   }

//   return labels;
// };

// const toCytoscopeLabel = (ls: Label[]): string => {
//   return ls.join("");
// };

export const graphToElements = (
  pn: Graph
): { elements: cytoscape.ElementDefinition[]; root: string } => {
  const visited = new Set<string>();
  const boxNames = new Set<string>();
  const roots = new Map<string, string>();
  const elements: cytoscape.ElementDefinition[] = [];

  let rootCnt = 0;

  const getBox = (id: string): Box | undefined => {
    const principalBox = pn.boxes.find((box) => box.principal.id === id);
    if (principalBox != null) {
      return principalBox;
    }
    const auxiliaryBox = pn.boxes.find(
      (box) => !!box.auxiliaries.find((aux) => aux.id === id)
    );
    if (auxiliaryBox != null) {
      return auxiliaryBox;
    }
    return undefined;
  };

  console.log(pn.boxes);

  const visitLink = (from: Edge, link: Link, boxStack: string[]) => {
    if (visited.has(link.id)) {
      return;
    }
    visited.add(link.id);
    console.log(from);

    const box = getBox(from.id);
    console.log(box);
    const boxId = box != null ? `${box.principal.id}-box` : undefined;

    const newBoxStack =
      boxId == null
        ? boxStack
        : boxStack.length > 0 && boxId === boxStack[0]
        ? boxStack.slice(1) // Leaving the box
        : [boxId, ...boxStack]; // Entering the box
    const currentBox = newBoxStack.at(0);
    console.log(boxId);
    console.log(newBoxStack);

    if (box && boxId && !boxNames.has(box.principal.id)) {
      boxNames.add(box.principal.id);
      elements.push({
        group: "nodes",
        data: {
          id: boxId,
          parent: boxStack.at(0),
          label: "!",
        },
      });
    }

    elements.push({
      group: "nodes",
      data: {
        id: link.id,
        label: linkNameToString(link),
        parent: currentBox,
      },
    });

    [
      ["principal", link.principal()] as [string, Edge],
      ...Object.entries(link.auxiliary()),
    ].forEach(([name, edge]) => {
      const to = other(link, edge);
      if (to != null) {
        elements.push({
          group: "edges",
          data: {
            source: link.id,
            target: to.id,
            id: edge.id,
            // label: toCytoscopeLabel(labelOfEdge(name, edge, pn.boxes)),
          },
        });
        if (!visited.has(to.id)) {
          visitLink(edge, to, newBoxStack);
        }
      } else {
        const rootId = `root${rootCnt++}`;
        roots.set(edge.id, rootId);
        elements.push(
          {
            group: "edges",
            data: {
              source: link.id,
              target: rootId,
              id: edge.id,
            },
          },
          {
            group: "nodes",
            data: {
              id: rootId,
              label: "root",
            },
          }
        );
      }
    });
  };

  visitLink(pn.root, pn.root.links[0], []);

  return { elements, root: roots.get(pn.root.id) ?? "root0" };
};
