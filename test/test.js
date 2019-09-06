const { interpreter } = require('../dist/index.js');

async function assert(t, msg) {
  try {
    const a = await t();
    if(!a) {
      console.error(msg, "failed");
      errored = true;
      return;
    } else {
      console.log(msg, "passed");
    }
  } catch (e) {
    console.error(msg, "failed with error", e);
  }
}

async function main() {
  let errored = false;
  await assert(async() =>
    await interpreter(
      ['let',
        [['n', 5]],
        ['*', 'n', 'n'],
      ]
    ) === 25,
    '1'
  );

  await assert(async() =>
    await interpreter(
      ['let',
        [
          ['fact', ['rec', 'self', ['n'], ['if', ['<', 'n', 2], 1, ['*', 'n', ['self', ['-', 'n', 1]]]]]]
        ],
        ['fact', 5]
      ]
    ) === 120,
    '2'
  );

  await assert(async() =>
    await interpreter(
      ['.', ['q', 'hello'], ['q', 'length']]
    ) === 5,
    '3'
  );
  
  await assert(async() =>
    typeof await interpreter(
      ['lambda', ['n'], ['^', 'n', 'n']]
    ) === 'function',
    '4'
  );

  await assert(async() =>
    await interpreter(
      [['lambda', ['n'], ['^', 'n', 'n']], 3]
    ) === 27,
    '5'
  );

  await assert(async() =>
    await interpreter(
      ['*', 5, 2]
    ) === 10,
    '6'
  );

  await assert(async() => {
    try {
      await interpreter(
        [['q', '*'], 5, 2]
      ); 
      return false;
    } catch (e) {
      return true;
    }
  }, '7');

  if (errored) throw new Error("Tests Failed");
}

main();