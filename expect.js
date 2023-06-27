async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
const allMatchers = {
  toBe(actual, expected) {
    //console.log("toBe:",actual,expected)
    if (this.isNot) {
      if (actual !== expected) {
        console.log(`${actual} is not equal to ${expected}.`);
      } else {
        throw new Error(`${actual} is equal to ${expected}.`);
      }
    } else {
      if (actual === expected) {
        console.log(`${actual} is  equal to ${expected}.`);
      } else {
        throw new Error(`${actual} is not equal to ${expected}.`);
      }
    }

  },
  async toBeAttached(actual, { attached = true, timeout = 10000 } = {}) {
	console.log(attached,timeout,this.isNot)
	await actual.waitFor(timeout)
		.then(async () => {
			console.log("then.")
			if (!this.isNot && attached){
				console.log("Locator is toBeAttached.")
			}else{
				return Promise.reject(new Error('Locator is not toBeAttached.'));
			}
		})
		.catch(async (error)=>{
			console.log("catch.")
			if (this.isNot && !attached){
				console.log("Locator is not toBeAttached.")
			}else{
				return Promise.reject(new Error('Locator is toBeAttached.'));
			}
		})
  },
}
const makeThrowingMatcher = (matcher, isNot, promise, actual, err) =>
  async function throwingMatcher(...args) {
    const matcherContext = {
      error: err,
      isNot,
      promise
    };
    //console.log("makeThrowingMatcher:",actual,...args)
    //console.log(matcher)
    await  matcher.call(matcherContext, actual, ...args)
  };

const expect = (actual, ...rest) => {
  if (rest.length !== 0) {
    throw new Error('Expect takes at most one argument.');
  }
  const expectation = {
    not: {},
  };
  Object.keys(allMatchers).forEach(name => {
    const matcher = allMatchers[name];
    //console.log(name,allMatchers[name])
    expectation[name] = makeThrowingMatcher(matcher, false, '', actual);
    expectation.not[name] = makeThrowingMatcher(matcher, true, '', actual);
  });
  return expectation;
};
exports.expect = expect;