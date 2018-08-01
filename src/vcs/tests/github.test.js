jest.mock('node-fetch')
jest.mock('../../node-wrappers')
jest.mock('../../logger')

const fetch = require('node-fetch')
const {exec} = require('../../node-wrappers')
const GitHub = require('../github')

describe('VCS / GitHub /', () => {
  let config
  let github

  beforeEach(() => {
    config = {
      ci: {
        gitUser: {
          email: 'travis-ci-ciena@gmail.com',
          name: 'travis-ci'
        },
        provider: 'travis'
      },
      computed: {
        ci: {
          branch: 'my-branch'
        },
        vcs: {
          auth: {
            readToken: 'my-ro-gh-token',
            writeToken: 'my-gh-token'
          }
        }
      },
      vcs: {
        provider: 'github',
        repository: {
          name: 'my-repo',
          owner: 'me'
        }
      }
    }

    github = new GitHub(config)
  })

  it('should save the config', () => {
    expect(github.config).toEqual(config)
  })

  describe('.addRemoteForPush()', () => {
    let remoteName

    beforeEach(() => {
      exec.mockReturnValue(Promise.resolve())
      return github.addRemoteForPush().then(name => {
        remoteName = name
      })
    })

    it('should makes the proper git remote command', () => {
      const url = 'https://my-gh-token@github.com/me/my-repo'
      expect(exec).toHaveBeenCalledWith(`git remote add ci-origin ${url}`)
    })

    it('should resolve with the proper remote name', () => {
      expect(remoteName).toBe('ci-origin')
    })
  })

  describe('.getPr()', () => {
    let resolution
    let rejection
    let promise
    let fetchResolver

    beforeEach(() => {
      fetchResolver = {}
      const fetchPromise = new Promise((resolve, reject) => {
        fetchResolver.resolve = resolve
        fetchResolver.reject = reject
      })

      fetch.mockReturnValue(fetchPromise)

      resolution = null
      rejection = null
      promise = github
        .getPr('5')
        .then(resp => {
          resolution = resp
          return resolution
        })
        .catch(err => {
          rejection = err
          throw err
        })
    })

    it('should call fetch with proper params', () => {
      expect(fetch).toHaveBeenCalledWith('https://api.github.com/repos/me/my-repo/pulls/5', {
        headers: {
          Authorization: 'token my-ro-gh-token'
        }
      })
    })

    describe('when fetch resolves with success', () => {
      let resp

      beforeEach(done => {
        const pr = {
          number: 5,
          body: '#minor#\r\n## Changelog\r\n### Added\r\n- Some really cool stuff',
          html_url: 'my-link-to-myself',
          head: {
            sha: 'sha-1'
          }
        }

        resp = {
          json: jest.fn().mockReturnValue(Promise.resolve(pr)),
          ok: true,
          status: 200
        }

        promise.then(() => {
          done()
        })

        fetchResolver.resolve(resp)
      })

      it('should resolve with the correct PR', () => {
        expect(resolution).toEqual({
          description: '#minor#\n## Changelog\n### Added\n- Some really cool stuff',
          headSha: 'sha-1',
          number: 5,
          url: 'my-link-to-myself'
        })
      })
    })

    describe('when fetch resolves with error', () => {
      let err
      let resp

      beforeEach(done => {
        err = {
          message: 'Uh oh'
        }

        resp = {
          json: jest.fn().mockReturnValue(Promise.resolve(err)),
          ok: false,
          status: 400
        }

        promise.catch(() => {
          done()
        })

        fetchResolver.resolve(resp)
      })

      it('should not resolve', () => {
        expect(resolution).toBe(null)
      })

      it('should reject with the proper error', () => {
        expect(rejection).toEqual(new Error(`400: ${JSON.stringify(err)}`))
      })
    })

    describe('when fetch errors', () => {
      beforeEach(done => {
        promise.catch(() => {
          done()
        })

        fetchResolver.reject('my-error')
      })

      it('should pass up the error', () => {
        expect(rejection).toBe('my-error')
      })
    })

    describe('with no readToken', () => {
      beforeEach(() => {
        delete github.config.computed.vcs.auth.readToken
        github.getPr('5')
      })

      it('should call fetch with proper params', () => {
        expect(fetch).toHaveBeenCalledWith('https://api.github.com/repos/me/my-repo/pulls/5', {headers: {}})
      })
    })
  })

  describe('.postComment()', () => {
    let fetchResolver
    let resolution
    let rejection
    let promise

    beforeEach(() => {
      fetchResolver = {}
      const fetchPromise = new Promise((resolve, reject) => {
        fetchResolver.resolve = resolve
        fetchResolver.reject = reject
      })

      fetch.mockReturnValue(fetchPromise)

      resolution = null
      rejection = null
      promise = github
        .postComment('5', 'Missing PR scope!')
        .then(resp => {
          resolution = resp
          return resolution
        })
        .catch(err => {
          rejection = err
          throw err
        })
    })

    it('should call fetch with proper params', () => {
      const url = 'https://api.github.com/repos/me/my-repo/issues/5/comments'
      expect(fetch).toHaveBeenCalledWith(url, {
        method: 'POST',
        body: JSON.stringify({body: 'Missing PR scope!'}),
        headers: {'Content-Type': 'application/json'}
      })
    })

    describe('when fetch resolves with success', () => {
      beforeEach(done => {
        promise.then(() => {
          done()
        })
        fetchResolver.resolve({ok: true, json: jest.fn().mockReturnValue(Promise.resolve())})
      })

      it('should resolve', () => {
        expect(resolution).toBe(undefined)
      })
    })

    describe('when fetch resolves with error', () => {
      let err
      let resp

      beforeEach(done => {
        err = {message: 'Uh oh'}
        resp = {
          ok: false,
          status: 400,
          json() {
            return Promise.resolve(err)
          }
        }
        promise.catch(() => {
          done()
        })
        fetchResolver.resolve(resp)
      })

      it('should not resolve', () => {
        expect(resolution).toBe(null)
      })

      it('should reject with proper error', () => {
        expect(rejection).toEqual(new Error(`400: ${JSON.stringify(err)}`))
      })
    })

    describe('when fetch rejects', () => {
      beforeEach(done => {
        promise.catch(() => {
          done()
        })
        fetchResolver.reject('Uh oh')
      })

      it('should not resolve', () => {
        expect(resolution).toBe(null)
      })

      it('should reject with proper error', () => {
        expect(rejection).toBe('Uh oh')
      })
    })
  })
})
