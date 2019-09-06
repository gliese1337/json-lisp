# json-lisp

JSON-LISP is a very simple LISP interpreter that uses JSON as its concrete syntax; thus, it comes with all the basic JSON data type built-in, and allows for easy integration of LISP-like domain-specific languages into JavaScript applications. Due to the excessive cumbersomeness of writing code in JSON, it is expected that most applications of this library will use it for interpreting auto-generated code of some sort, or API calls, or config files. Although it is possible, it is not expected that humans write large LISP programs by hand in JSON syntax. JSON-LISP serves as an alternative to [JSON-FORTH](https://www.npmjs.com/package/json-forth) in the simple-DSL space.

JSON-LISP ships with a preamble library of built-in functions and special forms to help get you started, but has no reserved words. All symbols in the default environment can be overwritten by the user of the library or by interpreted code.

The library exports an environment type `Env` and a single function, `interpreter(ast: unknown, bindings?: { [key: string]: unknown } | Env): Promise<unknown>`, which takes in an abstract syntax tree to interpret and an optional bindings object to supplement or replace the default global environment. A normal object be used to construct a new environment with the preamble as its parent, while supplying an `Env` object will replace the default global environment entirely. Anything value for `ast` other than an array will be returned as-is; arrays will be interpreted by recursively interpreting each of their elements, and then applying the first element as a function to the remaining elements as arguments.

The `Env` constructor has the type `new Env(pairs: [string, unknown][], parent?: Env)`. It is generally more ergonomic to just use a mapping object to pass in a custom initial global environment, but use of the `Env` constructor may be necessary for implementing some custom built-ins.

Custom built-in functions supplied in the `bindings` object should be native JavaScript functions, not JSON-LISP lambdas. Normal functions take a single parameter, which is a list of the interpreted arguments provided from JSON-LISP code. Implementations of special forms (i.e., syntax elements which do not evaluate their arguments ahead of time) take three parameters: a list of the unevaluated arguments from JSON-LISP code, a recursive reference to the interpreter internals which takes an `ast` object of any type and an evolution environment of type `Env`, and a reference to the current static environment (also of type `Env`).

#Evaluation order
JSON-LISP implements strict evaluation. Beyond strictness guarantees, however, the order of argument evaluation is undefined. This is done for improved throughput, as JSON-LISP is also fully aysnchronous; the exported interpreter and the internal interpreter reference passed to built-in function implementations both return `Promises`, the interpreted will take care of resolving all promises generated internally to maintain strictness, and `async` functions, or functions returning promises, are supported for built-in implementations. As a result, multiple argument expressions may end up executing concurrently, so care is recommended if you choose to introduce mutable references (no mutation is provided by the default preamble environment).

#Preamble

The functions and special forms defined in the preamble are as follows:

* `['lambda', params, body]` Creates an anonymous function object with a parameter list `params` and body expression `body`.
* `['macro', params, body]` Creates a new anonymous syntactic form with parameter list `params` and body expression `body`. The `body` expression is evaluated in the static scope of the macro definition, but the result of the macro is then re-evaluated in the static environment of the callsite, or the dynamic environment of the macro invocation. These macros are, therefore, *not* hygenic.
* `['rec', name, params, body]` Creates a recursive anonymous function which can refer to itself internally by `name`.
* `['recmacro', name, params, body]` Creates a recursive syntactic form which can refer to itself internally by `name`.
* `['apply', op, args]` Calls the operation `op` with the argument list `args`.
* `['let', [...[symbol, value]], body]` Creates a new environment by binding a list of symbol/value pairs, and evaluates the `body` expression in that environment.
* `['if', cnd, thn, els]` Evaluates `cnd`, then evaluates `thn` if `cnd` is true and `els` if `cnd` is false.
* `['q', expr]` Returns `expr` without evaluating it.
* `['list', ...args]` Evaluates all of its arguments and returns them in a list.
* `['+', ...args]` Sums all of its arguments, returning 0 for no arguments.
* `['-', ...args]` Subbtracts all remaining arguments from the first, returning 0 for no arguments.
* `['*', ...args]` Finds the product of all of its arguments, returning 1 for no arguments.
* `['/', ...args]` Recursively divides the running dividend by each successive argument after the first, returning 1 for no arguments.
* `['^', ...args]` Takes a running total to the power of each successive argument, returning 1 for less than 2 arguments.
* `['%', first, ...args]` Recursively takes the modulus of the running remainder by each sucessive argument after the first, returning the first argument unchanged for less than 2 arguments.
* `['>', ...args]` Returns a boolean indicating whether the arguments are in strict descending order.
* `['<', ...args]` Returns a boolean indicating whether the arguments are in strict ascending order.
* `['>=', ...args]` Returns a boolean indicating whether arguments are in non-strict descending order.
* `['<=', ...args]` Returns a boolean indicating whether the arguments are in non-strict ascending order.
* `['=', ...args]` Returns a boolean indicating whether the arguments are all strictly equal.
* `['!', bool]` Returns the logical negation of the argument.
* `['.', obj, ...path]` Returns the object obtained by recursively accessing fields of `obj` and its sub-objects as identified by the list of strings in `path`. Nulls and `undefined`s are coalesced.