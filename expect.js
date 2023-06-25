const matchers = {}
const makeThrowingMatcher = (matcher, isNot, promise, actual, err) =>
  function throwingMatcher(...args) {
    let throws = true;
    const matcherContext = {
      ...matcherUtilsThing,
      error: err,
      isNot,
      promise
    }; 
    let potentialResult;
    try {
      potentialResult = matcher.call(matcherContext, actual, ...args)
    } catch (error) {

    }
  };
const processResult = (result, asyncError) => {
  if ((result.pass && isNot) || (!result.pass && !isNot)) {
    // XOR
    const message = getMessage(result.message);
  } 
};
const expect = (actual, ...rest) => {
  if (rest.length !== 0) {
    throw new Error('Expect takes at most one argument.');
  }
  const allMatchers = matchers;
  const expectation = {
    not: {},
  };
  Object.keys(allMatchers).forEach(name => {
    const matcher = allMatchers[name];
    expectation[name] = makeThrowingMatcher(matcher, false, '', actual);
    expectation.not[name] = makeThrowingMatcher(matcher, true, '', actual);
  });
  return expectation;
};
exports.expect = expect;