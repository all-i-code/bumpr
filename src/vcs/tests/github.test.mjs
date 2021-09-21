import {jest} from '@jest/globals' // eslint-disable-line import/no-extraneous-dependencies

import {readFileSync} from 'fs'
import fetch from 'node-fetch'
import path from 'path'

import {exec} from '../../node-wrappers.mjs'
import GitHub from '../github.mjs'

jest.mock('fs')
jest.mock('node-fetch')
jest.mock('../../node-wrappers.mjs')
jest.mock('../../logger.mjs')

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
      }
    }
  })

  describe('when VCS in config', () => {
    beforeEach(() => {
      config.vcs = {
        provider: 'github',
        repository: {
          name: 'my-repo',
          owner: 'me'
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

    describe('.createRelease()', () => {
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
          .createRelease('tag1', 'Release 1', 'Some description')
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
        expect(fetch).toHaveBeenCalledWith('https://api.github.com/repos/me/my-repo/releases', {
          method: 'POST',
          body: JSON.stringify({
            body: 'Some description',
            name: 'Release 1',
            tag_name: 'tag1'
          }),
          headers: {
            Authorization: 'token my-gh-token',
            'Content-Type': 'application/json'
          }
        })
      })

      describe('when fetch resolves with success', () => {
        let resp
        let release

        beforeEach(done => {
          release = {
            id: 1,
            name: 'Release 1',
            body: 'Some description'
          }

          resp = {
            json: jest.fn().mockReturnValue(Promise.resolve(release)),
            ok: true,
            status: 200
          }

          promise.then(() => {
            done()
          })

          fetchResolver.resolve(resp)
        })

        it('should resolve with the correct PR', () => {
          expect(resolution).toEqual(release)
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
          expect(rejection).toEqual(new Error('400: {"message":"Uh oh"}'))
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
          expect(rejection).toEqual('my-error')
        })
      })
    })

    describe('.getMergedPrBySha()', () => {
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
          .getMergedPrBySha('sha-2')
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
        expect(fetch).toHaveBeenCalledWith(
          'https://api.github.com/repos/me/my-repo/pulls?state=closed&sort=updated&direction=desc',
          {
            headers: {
              Authorization: 'token my-ro-gh-token'
            }
          }
        )
      })

      describe('when fetch resolves with success (and matching PR found)', () => {
        let resp

        beforeEach(done => {
          const prs = [
            {
              number: 5,
              body: '#minor#\r\n## Changelog\r\n### Added\r\n- Some kinda cool stuff',
              user: {
                login: 'bot1',
                html_url: 'profile-of-bot1'
              },
              html_url: 'link-to-pr-5',
              merge_commit_sha: 'sha-1'
            },
            {
              number: 4,
              body: '#minor#\r\n## Changelog\r\n### Added\r\n- Some really cool stuff',
              user: {
                login: 'bot2',
                html_url: 'profile-of-bot2'
              },
              html_url: 'link-to-pr-4',
              merge_commit_sha: 'sha-2'
            },
            {
              number: 3,
              body: '#minor#\r\n## Changelog\r\n### Added\r\n- Some super cool stuff',
              user: {
                login: 'bot3',
                html_url: 'profile-of-bot3'
              },
              html_url: 'link-to-pr-3',
              merge_commit_sha: 'sha-3'
            }
          ]

          resp = {
            json: jest.fn().mockReturnValue(Promise.resolve(prs)),
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
            author: 'bot2',
            authorUrl: 'profile-of-bot2',
            description: '#minor#\n## Changelog\n### Added\n- Some really cool stuff',
            number: 4,
            url: 'link-to-pr-4'
          })
        })
      })

      describe('when fetch resolves with success (and no matching PR found)', () => {
        let resp

        beforeEach(done => {
          const prs = [
            {
              number: 5,
              body: '#minor#\r\n## Changelog\r\n### Added\r\n- Some kinda cool stuff',
              html_url: 'link-to-pr-5',
              merge_commit_sha: 'sha-1'
            },
            {
              number: 3,
              body: '#minor#\r\n## Changelog\r\n### Added\r\n- Some super cool stuff',
              html_url: 'link-to-pr-3',
              merge_commit_sha: 'sha-3'
            }
          ]

          resp = {
            json: jest.fn().mockReturnValue(Promise.resolve(prs)),
            ok: true,
            status: 200
          }

          promise.catch(() => {
            done()
          })

          fetchResolver.resolve(resp)
        })

        it('should reject with the proper error', () => {
          expect(rejection).toEqual(new Error('Unable to find a merged PR for sha sha-2'))
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
          expect(rejection).toEqual(new Error('Unable to find a merged PR for sha sha-2'))
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
          expect(rejection).toEqual(new Error('Unable to find a merged PR for sha sha-2'))
        })
      })

      describe('with no readToken', () => {
        beforeEach(() => {
          delete github.config.computed.vcs.auth.readToken
          github.getMergedPrBySha('sha-2')
        })

        it('should call fetch with proper params', () => {
          expect(
            fetch
          ).toHaveBeenCalledWith(
            'https://api.github.com/repos/me/my-repo/pulls?state=closed&sort=updated&direction=desc',
            {headers: {}}
          )
        })
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
            user: {
              login: 'bot',
              html_url: 'bot-profile'
            },
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
            author: 'bot',
            authorUrl: 'bot-profile',
            description: '#minor#\n## Changelog\n### Added\n- Some really cool stuff',
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

    describe('.uploadReleaseAsset()', () => {
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
          .uploadReleaseAsset('upload-url', 'application/zip', 123, 'mock-stream')
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
        expect(fetch).toHaveBeenCalledWith('upload-url', {
          method: 'POST',
          body: 'mock-stream',
          headers: {
            Authorization: 'token my-gh-token',
            'Content-Type': 'application/zip',
            'Content-Length': 123
          }
        })
      })

      describe('when fetch resolves with success', () => {
        let resp
        let release

        beforeEach(done => {
          release = {
            id: 1,
            name: 'Release 1',
            body: 'Some description'
          }

          resp = {
            json: jest.fn().mockReturnValue(Promise.resolve(release)),
            ok: true,
            status: 200
          }

          promise.then(() => {
            done()
          })

          fetchResolver.resolve(resp)
        })

        it('should resolve with the correct PR', () => {
          expect(resolution).toEqual(release)
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
          expect(rejection).toEqual(new Error('400: {"message":"Uh oh"}'))
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
          expect(rejection).toEqual('my-error')
        })
      })
    })
  })

  describe('when VCS omitted from config', () => {
    describe('when it successfully reads package.json in directory command is run from', () => {
      describe('when package.json contents is valid JSON', () => {
        describe('when repository is a string', () => {
          beforeEach(() => {
            readFileSync.mockReturnValue(
              JSON.stringify({
                repository: 'git@github.com:all-i-code/bumpr.git'
              })
            )

            github = new GitHub(config)
          })

          it('should set vcs config as expected', () => {
            expect(github.config.vcs.repository).toEqual({
              name: 'bumpr',
              owner: 'all-i-code'
            })
          })
        })

        describe('when repository is an object', () => {
          beforeEach(() => {
            readFileSync.mockReturnValue(
              JSON.stringify({
                repository: {
                  url: 'git@github.com:all-i-code/bumpr.git'
                }
              })
            )

            github = new GitHub(config)
          })

          it('should set vcs config as expected', () => {
            expect(github.config.vcs.repository).toEqual({
              name: 'bumpr',
              owner: 'all-i-code'
            })
          })
        })

        describe('when repository is an object with git+ssh url', () => {
          beforeEach(() => {
            readFileSync.mockReturnValue(
              JSON.stringify({
                repository: {
                  url: 'git+ssh://git@github.com/all-i-code/bumpr.git'
                }
              })
            )

            github = new GitHub(config)
          })

          it('should set vcs config as expected', () => {
            expect(github.config.vcs.repository).toEqual({
              name: 'bumpr',
              owner: 'all-i-code'
            })
          })
        })
      })

      it('should throw expected error when package.json contents is invalid JSON', () => {
        readFileSync.mockReturnValue('{')

        expect(() => {
          const github = new GitHub(config) // eslint-disable-line
        }).toThrow(`Failed to parse contents of ${path.join(process.cwd(), 'package.json')} as JSON`)
      })
    })

    it('should throw expected error when it fails to read package.json', () => {
      readFileSync.mockImplementation(() => {
        throw new Error()
      })

      expect(() => {
        const github = new GitHub(config) // eslint-disable-line
      }).toThrow(`Failed to read file: ${path.join(process.cwd(), 'package.json')}`)
    })
  })
})
