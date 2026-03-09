declare module "munkres-js" {
  function munkres(cost_matrix: number[][]): [number, number][];
  export = munkres;
}
