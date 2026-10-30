// Decorative stylizations, not astronomical charts. Extend this profile registry as needed.
export type ConstellationMotif = {
  nodes: { x: number; y: number; size: number; color: "purple" | "pink" | "aqua" }[];
  edges: [number, number][];
};
export const constellationMotifs: Record<string, ConstellationMotif> = {
  virgo: {
    nodes: [{ x: 12, y: 30, size: 12, color: "aqua" }, { x: 32, y: 18, size: 16, color: "purple" }, { x: 49, y: 35, size: 12, color: "pink" }, { x: 64, y: 25, size: 20, color: "aqua" }, { x: 78, y: 47, size: 13, color: "purple" }, { x: 49, y: 62, size: 17, color: "pink" }, { x: 30, y: 76, size: 11, color: "aqua" }],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6]],
  },
};
