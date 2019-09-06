import { Env } from './env';
import { preamble, Operator } from './preamble';

export async function interpreter(
    ast: unknown,
    env: Env = preamble,
): Promise<unknown> {
  if (Array.isArray(ast)) {
    const op = await interpreter(ast[0], env) as Operator;
    if (typeof op !== 'function') throw new Error(`Cannot apply ${ op }`);

    const unargs = ast.slice(1);
    return op.length > 1 ?
      op(unargs, interpreter, env):
      op(await Promise.all(unargs.map(arg => interpreter(arg, env))));
  }
  
  if (typeof ast === 'string') {
    return env.get(ast);
  }

  return ast;
}