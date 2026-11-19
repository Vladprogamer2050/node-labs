'use strict';

const { readProjectPackage } = require('./config-service');

/**
 * Deployment is simulated: the lab has no hosting account. The service still
 * reads the real project name, builds the target URL and returns a plan, so the
 * command demonstrates the full flow (confirmation, spinner, result).
 */
function planDeploy({ baseDir = '.', env = 'staging' } = {}) {
  const pkg = readProjectPackage(baseDir);
  return {
    name: pkg.name,
    env,
    url: `https://${pkg.name}.example.com`,
    simulated: true,
  };
}

module.exports = { planDeploy };
