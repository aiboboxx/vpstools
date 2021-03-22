const core = require('@actions/core');
const github = require('@actions/github');

try {
  // `who-to-greet` input defined in action metadata file
  const nameToGreet = core.getInput('who-to-greet');
  console.log(`Hello ${nameToGreet}!`);
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);
  console.log('github.action:'+ github.context.action);
  console.log('GITHUB_ACTION:' + $GITHUB_ACTION);
  console.log('env.AT_GIT_ACTION:' + $env.AT_GIT_ACTION);
} catch (error) {
  core.setFailed(error.message);
}