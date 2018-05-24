require('../typedefs')

const fetch = require('node-fetch')

const {Logger} = require('../logger')
const {exec} = require('../node-wrappers')

/**
 * Get fetch options
 * @param {Config} config - the pr-bumper config object
 * @returns {Object} the options
 */
function getFetchOpts(config) {
  const {readToken} = config.computed.vcs.auth
  const headers = {}
  Logger.log(`RO_GH_TOKEN = [${readToken}]`)
  if (readToken) {
    headers.Authorization = `token ${readToken}`
  }
  return {headers}
}

/**
 * Convert a GitHub PR to a PR representation
 * @param {GitHubPullRequest} ghPr - the API response from a GitHub API looking for a PR
 * @returns {PullRequest} a pull request in standard format
 */
function convertPr(ghPr) {
  return {
    number: ghPr.number,
    description: ghPr.body,
    url: ghPr.html_url,
    headSha: ghPr.head.sha
  }
}

/**
 * VCS interface for public GitHub (github.com)
 *
 * @class
 * @implements {Vcs}
 */
class GitHub {
  /**
   * @param {Config} config - the configuration object
   */
  constructor(config) {
    this.config = config
  }

  /**
   * Sometimes, based on the CI system, one might need to create a git remote to
   * be able to push, this method provides a hook to do just that.
   *
   * @returns {Promise} - a promise resolved with the name of the remote to be used for pushing
   */
  addRemoteForPush() {
    const ghToken = this.config.computed.vcs.auth.writeToken
    const {name, owner} = this.config.vcs.repository

    Logger.log('Adding ci-origin remote')

    // TODO: find a safer way to do this, as the token can be displayed if a bug
    // is introduced here and exec errors out.
    return exec(`git remote add ci-origin https://${ghToken}@github.com/${owner}/${name}`).then(() => 'ci-origin')
  }

  /**
   * Get the given PR
   * @param {String} prNumber - the PR number (i.e. 31)
   * @returns {Promise} a promise resolved with the PR object from the API
   */
  getPr(prNumber) {
    const {owner, name} = this.config.vcs.repository
    const url = `https://api.github.com/repos/${owner}/${name}/pulls/${prNumber}`

    Logger.log(`About to send GET to ${url}`)

    return fetch(url, getFetchOpts(this.config))
      .then(resp => resp.json().then(json => ({resp, json})))
      .then(({resp, json}) => {
        if (!resp.ok) {
          throw new Error(`${resp.status}: ${JSON.stringify(json)}`)
        }
        return json
      })
      .then(convertPr)
  }

  /**
   * Post a comment to the given PR
   * @param {String} prNumber - the PR number (i.e. 31)
   * @param {String} comment - the comment body
   * @returns {Promise} a promise resolved with result of posting the comment
   */
  postComment(prNumber, comment) {
    const {owner, name} = this.config.vcs.repository
    const url = `https://api.github.com/repos/${owner}/${name}/issues/${prNumber}/comments`
    Logger.log(`About to send POST to ${url}`)

    return fetch(url, {
      method: 'POST',
      body: JSON.stringify({body: comment}),
      headers: {'Content-Type': 'application/json'}
    })
      .then(resp => resp.json().then(json => ({resp, json})))
      .then(({resp, json}) => {
        if (!resp.ok) {
          throw new Error(`${resp.status}: ${JSON.stringify(json)}`)
        }
      })
  }
}

module.exports = GitHub
