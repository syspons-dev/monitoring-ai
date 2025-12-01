/**
 * Graph Description Interface
 *
 * Defines the structure for graph descriptions used to provide
 * user-facing information about graph behavior and capabilities.
 */

export interface GraphDescription {
  /** Display name of the graph */
  name: string;
  /** Short one-line description */
  shortDescription: string;
  /** How the graph behaves */
  behavior: {
    /** Summary of what it does */
    summary: string;
    /** Step-by-step process */
    howItWorks: string[];
    /** Key characteristics */
    characteristics: string[];
  };
  /** When to use or not use this graph */
  suitability: {
    /** Ideal use cases */
    bestFor: string[];
    /** Not recommended for */
    notSuitableFor: string[];
  };
  /** Graph nodes and their purposes */
  nodes: Array<{
    /** Node name */
    name: string;
    /** What this node does */
    description: string;
  }>;
  /** Example interaction */
  example: {
    /** Example user input */
    userMessage: string;
    /** Example AI output */
    aiResponse: string;
    /** Additional note */
    note: string;
  };
}
