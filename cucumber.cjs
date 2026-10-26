const { mkdirSync } = require('node:fs');
mkdirSync('reports', { recursive: true });

module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['dist/src/support/*.js', 'dist/src/steps/*.js'],
    parallel: 0,
    retry: 0,
    strict: true,
    publish: false,
    format: [
      'progress',
      'json:reports/cucumber.json',
      'html:reports/cucumber.html',
    ],
  },
};
