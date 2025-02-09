import { join, resolve } from 'path'
import {
  createViteLicensePlugin,
  PackageMeta,
  PluginOptions,
} from '../src/index'
import { build as viteBuild } from 'vite'
import react from '@vitejs/plugin-react'
import { expect, describe, it } from 'vitest'
import type { RollupOutput, OutputAsset } from 'rollup'

// There are a lot of warnings that tell us to use "type === 'asset'" instead
// of accessing "isAsset" on files in the bundle. We don't know where these
// are coming from and don't want them
const originalWarn = console.warn
console.warn = (...rest) => {
  if (
    !rest[0].match(/^Accessing "isAsset" on files in the bundle is deprecated/)
  ) {
    originalWarn(...rest)
  }
}

const root = join(process.cwd(), 'test')

async function build(opts: PluginOptions = {}): Promise<OutputAsset[]> {
  const result = (await viteBuild({
    root,
    logLevel: 'silent',
    plugins: [react(), createViteLicensePlugin(opts)],
  })) as RollupOutput

  const resultingFilenames = [
    opts.outputFilename ?? 'oss-licenses.json',
    ...(opts.additionalFiles ? Object.keys(opts.additionalFiles) : []),
  ]

  return result.output.filter(
    (output) =>
      output.type === 'asset' && resultingFilenames.includes(output.fileName)
  ) as OutputAsset[]
}

describe('e2e tests', () => {
  it('matches snapshot', async (t) => {
    expect(await build()).toMatchSnapshot()
  })

  it('matches snapshot when a custom outputFilename is defined', async (t) => {
    expect(
      await build({ outputFilename: 'bill-of-materials.json' })
    ).toMatchSnapshot()
  })

  it('matches snapshot when additionalFiles are configured', async (t) => {
    expect(
      await build({
        additionalFiles: {
          'oss-reverse.json': (p) => JSON.stringify(p.reverse(), null, 2),
        },
      })
    ).toMatchSnapshot()
  })

  it('matches snapshot when providing a custom transform function', async (t) => {
    expect(
      await build({
        transformFile: (p) => JSON.stringify(p.reverse(), null, 2),
      })
    ).toMatchSnapshot()
  })

  it('throws when encountering licenses configured as unacceptable', async (t) => {
    await expect(() =>
      build({
        unacceptableLicenseTest: (license) => ['MIT'].includes(license),
      })
    ).rejects.toThrowError(/found unacceptable license "mit"/i)
  })

  it('matches snapshot when packages have been excluded', async (t) => {
    expect(
      await build({ excludedPackageTest: (name) => name === 'react' })
    ).toMatchSnapshot()
  })

  it('matches snapshot when packages are added manually', async (t) => {
    expect(
      await build({
        includePackages: () => [resolve(process.cwd(), 'node_modules/vite')],
      })
    ).toMatchSnapshot()
  })

  it('matches snapshot when already included snapshot is added manually', async (t) => {
    expect(
      await build({
        includePackages: () => [
          resolve(process.cwd(), 'test/node_modules/react'),
        ],
      })
    ).toMatchSnapshot()
  })

  it('matches snapshot when a package license is overridden', async (t) => {
    expect(
      await build({ licenseOverrides: { 'scheduler@0.23.0': 'Apache-2.0' } })
    ).toMatchSnapshot()
  })

  it('throws when encountering invalid SPDX expressions', async (t) => {
    await expect(() =>
      build({ licenseOverrides: { 'scheduler@0.23.2': 'Apache 2.0' } })
    ).rejects.toThrowError(/is not a valid spdx expression!/i)
  })

  it('matches snapshot when encountering deprecated package.json license field with an object value', async (t) => {
    expect(
      await build({
        __mocks__: {
          async readPackageMeta() {
            return {
              name: 'react',
              version: '16.0.0',
              license: { type: 'WTFPL' },
            }
          },
        },
      })
    ).toMatchSnapshot()
  })

  it('throws when not finding license information in package.json', async (t) => {
    await expect(() =>
      build({
        __mocks__: {
          async readPackageMeta() {
            return {
              name: 'react',
              version: '16.0.0',
            }
          },
        },
      })
    ).rejects.toThrowError(/could not find license info for/i)
  })

  it('matches snapshot when file with license text is not found', async (t) => {
    expect(
      await build({
        __mocks__: {
          async getLicenseFileName() {
            return undefined
          },
        },
      })
    ).toMatchSnapshot()
  })

  it('matches snapshot when fetching default license texts', async (t) => {
    expect(
      await build({
        replenishDefaultLicenseTexts: true,
        __mocks__: {
          async getLicenseFileName() {
            return undefined
          },
        },
      })
    ).toMatchSnapshot()
  })

  it("throws when SEE LICENSE IN file doesn't exist", async (t) => {
    await expect(
      build({
        replenishDefaultLicenseTexts: true,
        __mocks__: {
          getLicense: () => 'SEE LICENSE IN horst.txt',
        },
      })
    ).rejects.toThrowError(
      /could not find file specified in package.json license field/i
    )
  })

  it('matches snapshot when encountering deprecated package.json licenses array', async (t) => {
    async function readPackageMeta(
      dir: string,
      originalMethod: (dir: string) => Promise<PackageMeta>
    ) {
      const meta = await originalMethod(dir)
      if (dir === join(root, 'node_modules/react')) {
        delete meta.license
        meta.licenses = [{ type: 'WTFPL' }, { type: 'MIT' }]
      }
      return meta
    }

    expect(await build({ __mocks__: { readPackageMeta } })).toMatchSnapshot()
    expect(
      await build({
        preferredLicenses: ['MIT'],
        __mocks__: { readPackageMeta },
      })
    ).toMatchSnapshot()
    expect(
      await build({
        preferredLicenses: ['ISC'],
        __mocks__: { readPackageMeta },
      })
    ).toMatchSnapshot()
  })

  it('matches snapshot when encountering deprecated package.json licenses field', async (t) => {
    async function readPackageMeta(
      dir: string,
      originalMethod: (dir: string) => Promise<PackageMeta>
    ) {
      const meta = await originalMethod(dir)
      if (dir === join(root, 'node_modules/react')) {
        delete meta.license
        meta.licenses = 'Beerware'
      }
      return meta
    }

    expect(await build({ __mocks__: { readPackageMeta } })).toMatchSnapshot()
  })
})
