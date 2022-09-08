import React from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";

import dynamic from "next/dynamic";

import type { NextPage } from "next";
import { Graph, graphToElements, termToGraph } from "../models/types/graph";
import { parseTerm } from "../models/parser";

const Home: NextPage = dynamic(import("../components/graphViewer"), {
  ssr: false,
});

export default Home;
