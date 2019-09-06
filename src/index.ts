import { Env } from './env';
import { preamble, Operator } from './preamble';

async function apply(op: Operator, env: Env, args: unknown[]): Promise<unknown> {
  return op.length > 1 ?
    op(args, interp, env):
    op(await Promise.all(args.map(arg => interp(arg, env))))
}

async function interp(ast: unknown, env: Env) {
  if (Array.isArray(ast)) {
    const stack = [];
    let expr = ast;
    do {
      stack.push(expr);
      expr = expr[0];
    } while (Array.isArray(expr));
    if (typeof expr !== 'string') throw new Error(`Cannot apply ${ expr }`);

    let op = env.get(expr) as Operator;
    if (typeof op !== 'function') throw new Error(`Cannot apply ${ op }`);

    for (let i = stack.length - 1; i > 0; i--) {
      op = await apply(op, env, stack[i].slice(1)) as Operator;
      if (typeof op !== 'function') throw new Error(`Cannot apply ${ op }`);
    }

    return apply(op, env, stack[0].slice(1));
  }
  
  if (typeof ast === 'string') {
    return env.get(ast);
  }

  return ast;
}

export type Env = Env;

export async function interpreter(
    ast: unknown,
    bindings?: { [key: string]: unknown } | Env,
) {
  const env = bindings ? (bindings instanceof Env ? bindings : new Env(Object.entries(bindings), preamble)) : preamble;
  return interp(ast, env);
}