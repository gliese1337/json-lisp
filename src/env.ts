export class Env {
  private symbols: Map<string, unknown>;

  constructor(symbols: [string, unknown][], private parent: Env | null = null){
    this.symbols = new Map(symbols);
  }

  public get(sym: string) {
    for (let e: Env|null = this; e; e = e.parent) {
      if (e.symbols.has(sym)) return e.symbols.get(sym);
    }

    throw new Error(`symbol ${ sym } not found in current environment`);
  }
}