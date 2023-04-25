module.exports = {
  ci: {
    env: {
      branch: 'GITHUB_REF_NAME',
      buildNumber: 'GITHUB_RUN_NUMBER',
      prNumber: '',
      prUrl: '',
      ref: 'GITHUB_REF',
    },
    provider: 'github',
  },
  features: {
    changelog: {
      enabled: true,
    },
    comments: {
      enabled: true,
    },
    logging: {
      enabled: true,
      file: '.bumpr-log.json',
    },
    release: {
      enabled: true,
    },
  },
}
