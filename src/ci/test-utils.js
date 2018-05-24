const CiBase = require('./base')

exports.ensureCiBaseMethodIsUsed = function ensureCiBaseMethodIsUsed(ctx, methodName) {
  describe(`.${methodName}()`, () => {
    let result

    beforeEach(() => {
      const {ci} = ctx
      jest.spyOn(CiBase.prototype, methodName).mockReturnValue(Promise.resolve(`${methodName}-finished`))

      return ci[methodName]('some-args').then(res => {
        result = res
      })
    })

    afterEach(() => {
      CiBase.prototype[methodName].mockRestore()
    })

    it(`should call the base ${methodName}()`, () => {
      expect(CiBase.prototype[methodName]).toHaveBeenCalledWith('some-args')
    })

    it(`should resolve with the result of the base ${methodName}()`, () => {
      expect(result).toBe(`${methodName}-finished`)
    })
  })
}
