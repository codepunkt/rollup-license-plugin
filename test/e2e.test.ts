import { join, resolve } from 'path'
import {
  createViteLicensePlugin,
  PackageMeta,
  PluginOptions,
} from '../src/index'
import { build as viteBuild } from 'vite'
import react from '@vitejs/plugin-react'
import test from 'ava'
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

test('matches snapshot', async (t) => {
  t.snapshot(await build())
})

test('matches snapshot when a custom outputFilename is defined', async (t) => {
  t.snapshot(await build({ outputFilename: 'bill-of-materials.json' }))
})

test('matches snapshot when additionalFiles are configured', async (t) => {
  t.snapshot(
    await build({
      additionalFiles: {
        'oss-reverse.json': (p) => JSON.stringify(p.reverse(), null, 2),
      },
    })
  )
})

test('throws when encountering licenses configured as unacceptable', async (t) => {
  await t.throwsAsync(
    () =>
      build({
        unacceptableLicenseTest: (license) => ['MIT'].includes(license),
      }),
    { message: new RegExp('Found unacceptable license "MIT"') }
  )
})

test('matches snapshot when packages have been excluded', async (t) => {
  t.snapshot(await build({ excludedPackageTest: (name) => name === 'react' }))
})

test('matches snapshot when packages are added manually', async (t) => {
  t.snapshot(
    await build({
      includePackages: () => [resolve(process.cwd(), 'node_modules/vite')],
    })
  )
})

test('matches snapshot when already included snapshot is added manually', async (t) => {
  t.snapshot(
    await build({
      includePackages: () => [
        resolve(process.cwd(), 'test/node_modules/react'),
      ],
    })
  )
})

test('matches snapshot when a package license is overridden', async (t) => {
  t.snapshot(
    await build({ licenseOverrides: { 'scheduler@0.23.0': 'Apache-2.0' } })
  )
})

test('throws when encountering invalid SPDX expressions', async (t) => {
  await t.throwsAsync(
    () => build({ licenseOverrides: { 'scheduler@0.23.2': 'Apache 2.0' } }),
    {
      message: new RegExp(
        'License "Apache 2.0" for scheduler@0.23.2 is not a valid SPDX expression!'
      ),
    }
  )
})

test('matches snapshot when encountering deprecated package.json license field with an object value', async (t) => {
  t.snapshot(
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
  )
})

test('matches snapshot when file with license text is not found', async (t) => {
  t.snapshot(
    await build({
      __mocks__: {
        async getLicenseFileName() {
          return undefined
        },
      },
    })
  )
})

test('matches snapshot when fetching default license texts', async (t) => {
  t.snapshot(
    await build({
      replenishDefaultLicenseTexts: true,
      __mocks__: {
        async getLicenseFileName() {
          return undefined
        },
      },
    })
  )
})

test("throws when SEE LICENSE IN file doesn't exist", async (t) => {
  await t.throwsAsync(
    () =>
      build({
        replenishDefaultLicenseTexts: true,
        __mocks__: {
          getLicense: () => 'SEE LICENSE IN horst.txt',
        },
      }),
    {
      message: new RegExp(
        'Could not find file specified in package.json license field'
      ),
    }
  )
})

test('matches snapshot when encountering deprecated package.json licenses array', async (t) => {
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

  t.snapshot(await build({ __mocks__: { readPackageMeta } }))
  t.snapshot(
    await build({ preferredLicenses: ['MIT'], __mocks__: { readPackageMeta } })
  )
})

test('matches snapshot when encountering deprecated package.json licenses field', async (t) => {
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

  t.snapshot(await build({ __mocks__: { readPackageMeta } }))
})
