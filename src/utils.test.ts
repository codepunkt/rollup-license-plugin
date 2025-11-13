import { describe, expect, it } from 'vitest'
import { getLicense } from './utils'

describe('getLicense', function () {
  it('works with string-type license field', function () {
    expect(
      getLicense('foo@1.2.3', {
        name: 'foo',
        version: '1.2.3',
        license: 'MIT',
      })
    ).toBe('MIT')
  })

  it('works with deprecated object-type license field', function () {
    expect(
      getLicense('foo@1.2.3', {
        name: 'foo',
        version: '1.2.3',
        license: {
          type: 'MIT',
          url: 'https://www.opensource.org/licenses/mit-license.php',
        },
      })
    ).toBe('MIT')
  })

  it('works with deprecated licenses field', function () {
    expect(
      getLicense('foo@1.2.3', {
        name: 'foo',
        version: '1.2.3',
        licenses: [
          {
            type: 'MIT',
            url: 'https://www.opensource.org/licenses/mit-license.php',
          },
          {
            type: 'Apache-2.0',
            url: 'https://opensource.org/licenses/apache2.0.php',
          },
        ],
      })
    ).toBe('MIT')
  })

  it('works with incorrect string-type licenses field', function () {
    expect(
      getLicense('foo@1.2.3', {
        name: 'foo',
        version: '1.2.3',
        licenses: 'MIT',
      })
    ).toBe('MIT')
  })

  it('throws if license is missing', function () {
    expect(() =>
      getLicense('foo@1.2.3', {
        name: 'foo',
        version: '1.2.3',
      })
    ).toThrow(new Error('Could not find license info for foo@1.2.3'))
  })

  it('throws if license is invalid', function () {
    expect(() =>
      getLicense('foo@1.2.3', {
        name: 'foo',
        version: '1.2.3',
        license: 'abc 123 {}?<>',
      })
    ).toThrow(
      new Error(
        'License "abc 123 {}?<>" for foo@1.2.3 is not a valid SPDX expression!'
      )
    )
  })

  it('throws if license is unacceptable', function () {
    expect(() =>
      getLicense(
        'foo@1.2.3',
        {
          name: 'foo',
          version: '1.2.3',
          license: 'MIT',
        },
        {
          unacceptableLicenseTest: (license) => license === 'MIT',
        }
      )
    ).toThrow(new Error('Found unacceptable license "MIT" for foo@1.2.3'))
  })

  it('allows overriding license values using exact version numbers', function () {
    expect(
      getLicense(
        'foo@1.2.3',
        {
          name: 'foo',
          version: '1.2.3',
          license: 'MIT',
        },
        {
          unacceptableLicenseTest: (license) => license === 'MIT',
          licenseOverrides: {
            'foo@1.2.3': 'Apache-2.0',
          },
        }
      )
    ).toBe('Apache-2.0')
  })

  it('allows overriding license values for scoped packages', function () {
    expect(
      getLicense(
        '@foo/bar@1.2.3',
        {
          name: '@foo/bar@',
          version: '1.2.3',
          license: 'MIT',
        },
        {
          unacceptableLicenseTest: (license) => license === 'MIT',
          licenseOverrides: {
            '@foo/bar@1.2.3': 'Apache-2.0',
          },
        }
      )
    ).toBe('Apache-2.0')
  })

  it('allows overriding license values using version ranges', function () {
    expect(
      getLicense(
        'foo@1.2.3',
        {
          name: 'foo',
          version: '1.2.3',
          license: 'MIT',
        },
        {
          unacceptableLicenseTest: (license) => license === 'MIT',
          licenseOverrides: {
            'foo@1.x': 'Apache-2.0',
          },
        }
      )
    ).toBe('Apache-2.0')
  })

  it('allows overriding license values without specifying versions', function () {
    expect(
      getLicense(
        'foo@1.2.3',
        {
          name: 'foo',
          version: '1.2.3',
          license: 'MIT',
        },
        {
          unacceptableLicenseTest: (license) => license === 'MIT',
          licenseOverrides: {
            foo: 'Apache-2.0',
          },
        }
      )
    ).toBe('Apache-2.0')
  })
})
