import { Env } from './env';
import { Interp } from './preamble';

function cmp_reduce(args: string[], cmp: string) {
  const l = args.length - 1;
  const ops: string[] = [];
  for (let i = 0; i < l; i++) {
    ops.push(`((${ args[i] }) ${ cmp } (${ args[i+1] }))`);
  }
  return ops.join('&&');
}

let i = 0;
function gensym() {
  return 'sym'+(i++);
}

export const compiler = new Env([
  ['lambda', (
    [params, body]: [string[], unknown],
    interp: Interp,
    env: Env,
  ) =>
    `function(${ params.join(',') }) { return (${
      interp(body, new Env(params.map((p) => [p, p] as [string, unknown]), env))
    }); }`     
  ],
  ['rec', (
    [name, params, body]: [string, string[], unknown],
    interp: Interp,
    env: Env,
  ) => {
    const self = gensym();
    return `function ${ self }(${ params.join(', ') }) { return (${
      interp(body, new Env([[name, self], ...params.map((p) => [p, p] as [string, unknown])], env))
    }); }`;
  }],
  ['apply', async(
    [op, args]: [unknown, unknown[]],
    interp: Interp,
    env: Env,
  ) => `${ op }.call(null, ${ (await Promise.all(args.map(a => interp(a, env)))).join(', ') })`
  ],
  ['let', async(
    [bindings, body]: [[string, unknown][], unknown],
    interp: Interp,
    env: Env,
  ) => `function(${
    bindings.map(([sym]) => sym).join(', ')
  }) { return (${
    interp(body, new Env(bindings.map(([p]) => [p, p] as [string, unknown]), env))
  }); } (${
    (await Promise.all(bindings.map(([, expr]) => interp(expr, env)))).join(', ')
  })`],
  ['if', async(
    [cnd, thn, els]: [unknown, unknown, unknown],
    interp: Interp,
    env: Env,
  ) => 
    `(${ await interp(cnd, env) }) ? (${ await interp(thn, env) }) : (${ await interp(els, env) })`
  ],
  ['q', (args: unknown[], _: Interp, __: Env) => args[0]],
  ['list', (args: unknown[]) => args],
  ['+', (args: string[]) => args.length === 0 ? '0' :
                            args.length === 1 ? args[0] :
                            args.map(a => `(${ a })`).join('+')],
  ['-', (args: string[]) => args.length === 0 ? '0' :
                            args.length === 1 ? `-(${args[0]})` :
                            args.map(a => `(${ a })`).join('-')],
  ['*', (args: string[]) => args.length === 0 ? '1' :
                            args.length === 1 ? args[0] :
                            args.map(a => `(${ a })`).join('*')],
  ['/', (args: string[]) => args.length === 0 ? '1' :
                            args.length === 1 ? `1/(${args[0]})` :
                            `(${ args.reduce((a, b) => `(${ a })/${ b }`) })` ],
  ['^', (args: string[]) => args.length < 2 ? '1' :
                            args.reduce((a, b) => `Math.pow(${ a }, ${ b })`) ],
  ['%', (args: string[]) => args.length === 0 ? '1' :
                            args.length === 1 ? args[0] :
                            `(${ args.reduce((a, b) => `(${ a })%${ b }`) })` ],
  ['>', (args: string[]) => cmp_reduce(args, '<=')],
  ['<', (args: string[]) => cmp_reduce(args, '>=')],
  ['>=', (args: string[]) => cmp_reduce(args, '<')],
  ['<=', (args: string[]) => cmp_reduce(args, '>')],
  ['=', (args: string[]) =>  cmp_reduce(args, '!==')],
  ['!', (args: [boolean]) => `!(${ args[0] })`],
  ['and', async(
    args: unknown[],
    interp: Interp,
    env: Env,
  ) =>
    `(${ (await Promise.all(args.map(a => interp(a, env)))).join(')&&(') })`
  ],
  ['or', async(
    args: unknown[],
    interp: Interp,
    env: Env,
  ) =>
    `((${ (await Promise.all(args.map(a => interp(a, env)))).join(')||(') })`
  ],
  ['.', ([obj, ...path]: string[]) => `function(){try{return (${ obj })[${ path.join('][') }];}catch(_){return null;}}()`],
]);