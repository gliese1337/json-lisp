import { Env } from './env';

export type Operator = (args: unknown[], interp?: (ast: unknown, env: Env) => Promise<unknown>, env?: Env) => unknown;

function cmp_reduce(args: number[], cmp: (a: number, b: number) => boolean) {
  const l = args.length - 1;
  for (let i = 0; i < l; i++) {
    if (cmp(args[i], args[i+1])) return false;
  }
  return true;
}

export const preamble = new Env([
  ['lambda', (
    [params, body]: [string[], unknown],
    interp: (ast: unknown, env: Env) => Promise<unknown>,
    env: Env,
  ) =>
    (args: unknown[]) => 
      interp(body, new Env(params.map((p, i) => [p, args[i]] as [string, unknown]), env))
  ],
  ['macro', (
    [params, body]: [string[], unknown],
    _: (ast: unknown, env: Env) => Promise<unknown>,
    stcEnv: Env,
  ) =>
    async(args: unknown[], interp: (ast: unknown, env: Env) => Promise<unknown>, dynEnv: Env) => 
      interp(await interp(body, new Env(params.map((p, i) => [p, args[i]] as [string, unknown]), stcEnv)), dynEnv)
  ],
  ['rec', (
    [name, params, body]: [string, string[], unknown],
    interp: (ast: unknown, env: Env) => Promise<unknown>,
    env: Env,
  ) => {
    const f = (args: unknown[]) => interp(body, new Env([[name, f], ...params.map((p, i) => [p, args[i]] as [string, unknown])], env));
    return f;
  }],
  ['recmacro', (
    [name, params, body]: [string, string[], unknown],
    _: (ast: unknown, env: Env) => Promise<unknown>,
    stcEnv: Env,
  ) => {
    const m = async(args: unknown[], interp: (ast: unknown, env: Env) => Promise<unknown>, dynEnv: Env) => 
      interp(await interp(body, new Env([[name, m], ...params.map((p, i) => [p, args[i]] as [string, unknown])], stcEnv)), dynEnv)
    return m;
  }],
  ['apply', (
    [op, args]: [unknown, unknown[]],
    interp: (ast: unknown, env: Env) => Promise<unknown>,
    env: Env,
  ) =>
      interp([op, ...args], env)
  ],
  ['let', async(
    [bindings, body]: [[string, unknown][], unknown],
    interp: (ast: unknown, env: Env) => Promise<unknown>,
    env: Env,
  ) => 
    interp(body, new Env(await Promise.all(bindings.map(async([ sym, expr ]) => [sym, await interp(expr, env)] as [string, unknown])), env))
  ],
  ['if', async(
    [cnd, thn, els]: [unknown, unknown, unknown],
    interp: (ast: unknown, env: Env) => Promise<unknown>,
    env: Env,
  ) => 
    interp(await interp(cnd, env) ? thn : els, env)
  ],
  ['q', (args: unknown[], _: (ast: unknown, env: Env) => Promise<unknown>, __: Env) => args[0]],
  ['list', (args: unknown[]) => args],
  ['+', (args: number[]) => args.reduce((a, b) => a + b, 0)],
  ['-', (args: number[]) => args.length ? args.reduce((a, b) => a - b) : 0],
  ['*', (args: number[]) => args.reduce((a, b) => a * b, 1)],
  ['/', (args: number[]) => args.length ? args.reduce((a, b) => a / b) : 1],
  ['^', (args: number[]) => args.length < 2 ? 1 : args.reduce((a, b) => Math.pow(a, b))],
  ['%', (args: number[]) => args.length < 2 ? args[0] : args.reduce((a, b) => a % b)],
  ['>', (args: number[]) => cmp_reduce(args, (a, b) => a <= b)],
  ['<', (args: number[]) => cmp_reduce(args, (a, b) => a >= b)],
  ['>=', (args: number[]) => cmp_reduce(args, (a, b) => a < b)],
  ['<=', (args: number[]) => cmp_reduce(args, (a, b) => a > b)],
  ['=', (args: number[]) =>  cmp_reduce(args, (a, b) => a !== b)],
  ['!', (args: [boolean]) => !args[0]],
  ['.', ([obj, ...path]: [any, ...string[]]) => {
    const l = path.length;
    for (let i = 0; obj !== void 0 && obj !== null && i < l; i++) {
      obj = obj[path[i]];
    }

    return obj;
  }]
]);