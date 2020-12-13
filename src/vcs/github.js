require('../typedefs')

const {readFileSync} = require('fs')
const fetch = require('node-fetch')
const path = require('path')

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
  if (readToken) {
    headers.Authorization = `token ${readToken}`
  }
  return {headers}
}

function convertLineEndings(str) {
  return str.replace(/\r\n/g, '\n')
}

/**
 * Convert a GitHub PR to a PR representation
 * @param {GitHubPullRequest} ghPr - the API response from a GitHub API looking for a PR
 * @returns {PullRequest} a pull request in standard format
 */
function convertPr(ghPr) {
  return {
    author: ghPr.user.login,
    authorUrl: ghPr.user.html_url,
    description: convertLineEndings(ghPr.body),
    name: ghPr.title,
    number: ghPr.number,
    url: ghPr.html_url
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

    if (!this.config.vcs) {
      this.config.vcs = {}
    }

    if (!this.config.vcs.repository) {
      const filePath = path.join(process.cwd(), 'package.json')

      let contents

      try {
        contents = readFileSync(filePath)
      } catch (err) {
        throw new Error(`Failed to read file: ${filePath}`)
      }

      let repository

      try {
        repository = JSON.parse(contents).repository // eslint-disable-line prefer-destructuring
      } catch (err) {
        throw new Error(`Failed to parse contents of ${filePath} as JSON`)
      }

      let str

      if (typeof repository === 'string') {
        str = repository
      } else {
        str = repository.url
      }

      const [owner, name] = str
        .replace('git@github.com:', '')
        .replace('git+ssh://git@github.com/', '')
        .replace('.git', '')
        .split('/')

      this.config.vcs.repository = {owner, name}
    }
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
   * Create a release based on given tag name
   * @param {String} tagName - the name of the tag to use to create release
   * @param {String} releaseName - the name of the release
   * @param {String} description - the description of the release (changelog info)
   * @returns {Promise} a promise resolved with result of creating the release
   */
  createRelease(tagName, releaseName, description) {
    const {owner, name} = this.config.vcs.repository
    const url = `https://api.github.com/repos/${owner}/${name}/releases`
    Logger.log(`About to send POST to ${url}`)

    const ghToken = this.config.computed.vcs.auth.writeToken
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        body: description,
        name: releaseName,
        tag_name: tagName
      }),
      headers: {
        Authorization: `token ${ghToken}`,
        'Content-Type': 'application/json'
      }
    })
      .then(resp => resp.json().then(json => ({resp, json})))
      .then(({resp, json}) => {
        if (!resp.ok) {
          throw new Error(`${resp.status}: ${JSON.stringify(json)}`)
        }

        return json
      })
  }

  /**
   * Get the merged PR by the given sha
   * @param {String} sha - the merge_commit_sha of the PR
   * @returns {Promise} a promise resolved with the PR object from the API
   */
  getMergedPrBySha(sha) {
    const {owner, name} = this.config.vcs.repository
    const url = `https://api.github.com/repos/${owner}/${name}/pulls?state=closed&sort=updated&direction=desc`

    Logger.log(`About to send GET to ${url}`)

    return fetch(url, getFetchOpts(this.config))
      .then(resp => resp.json().then(json => ({resp, json})))
      .then(({resp, json}) => {
        if (!resp.ok) {
          throw new Error(`${resp.status}: ${JSON.stringify(json)}`)
        }
        return json
      })
      .then(prs => prs.find(pr => pr.merge_commit_sha === sha))
      .then(convertPr)
      .catch(() => {
        throw new Error(`Unable to find a merged PR for sha ${sha}`)
      })
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

  /**
   * Upload a release asset
   * @param {String} url - the url to upload to
   * @param {String} type - the content-type of the file being uploaded
   * @param {Number} size - the content-size of the file being uploaded
   * @param {ByteStream} stream - the stream of the asset to upload
   * @returns {Promise} a promise resolved with result of creating the release
   */
  uploadReleaseAsset(url, type, size, stream) {
    Logger.log(`About to send POST to ${url}`)

    const ghToken = this.config.computed.vcs.auth.writeToken
    return fetch(url, {
      method: 'POST',
      body: stream,
      headers: {
        Authorization: `token ${ghToken}`,
        'Content-Type': type,
        'Content-Length': size
      }
    })
      .then(resp => resp.json().then(json => ({resp, json})))
      .then(({resp, json}) => {
        if (!resp.ok) {
          throw new Error(`${resp.status}: ${JSON.stringify(json)}`)
        }

        return json
      })
  }
}

module.exports = GitHub
