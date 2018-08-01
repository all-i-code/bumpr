module.exports = {
  features: {
    changelog: {
      enabled: true
    },
    comments: {
      enabled: true
    },
    logging: {
      enabled: true,
      file: '.bumpr-log.json'
    }
  },
  vcs: {
    repository: {
      name: 'bumpr',
      owner: 'jobsquad'
    }
  }
}
