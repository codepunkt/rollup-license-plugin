import type { Plugin as RollupPlugin } from 'rollup'

import type { Plugin as VitePlugin } from 'vite'
import getNpmTarballUrl from 'get-npm-tarball-url'

import type { LicenseMeta, PluginOptions } from './types.js'
import {
  getLicense,
  getLicenseText,
  getRepository,
  readPackageMeta,
} from './utils.js'

export function createRollupLicensePlugin(
  pluginOptions: PluginOptions = {},
  pluginName: string = 'rollup-license-plugin'
): RollupPlugin {
  const moduleDirs = new Set<string>()

  return {
    name: pluginName,

    renderChunk(_code, chunk) {
      Object.entries(chunk.modules)
        .filter(
          ([path, module]) =>
            Boolean(path.match(/node_modules/)) && module.renderedLength > 0
        )
        .map(([path]) =>
          (path.startsWith('\0') ? path.replace(/^\0/, '') : path).replace(
            /\\/g,
            '/'
          )
        )
        .map((path) => [path, path.split('node_modules').pop()])
        .map(([path, filePath]) => {
          const segments = filePath.replace(/^\//, '').split('/')
          const packageName = segments[0].startsWith('@')
            ? `${segments[0]}/${segments[1]}`
            : segments[0]
          return path.replace(filePath, '') + `/${packageName}`
        })
        .forEach((moduleDir) => moduleDirs.add(moduleDir))

      return null
    },

    async generateBundle() {
      const licenseMeta: LicenseMeta[] = []

      const getLicenseFn = pluginOptions.__mocks__?.getLicense ?? getLicense

      if (pluginOptions.includePackages) {
        for (const moduleDir of await pluginOptions.includePackages()) {
          moduleDirs.add(moduleDir)
        }
      }

      for (const moduleDir of Array.from(moduleDirs)) {
        const meta = await (pluginOptions.__mocks__?.readPackageMeta
          ? pluginOptions.__mocks__.readPackageMeta(moduleDir, readPackageMeta)
          : readPackageMeta(moduleDir))
        const packageId = `${meta.name}@${meta.version}`
        if (
          pluginOptions.excludedPackageTest &&
          pluginOptions.excludedPackageTest(meta.name, meta.version)
        ) {
          continue
        }

        const license = getLicenseFn(packageId, meta, pluginOptions)
        const licenseText = await getLicenseText(
          packageId,
          license,
          moduleDir,
          pluginOptions
        )
        const repository = getRepository(meta)

        const source = getNpmTarballUrl(meta.name, meta.version)
        licenseMeta.push({
          name: meta.name,
          version: meta.version,
          author: meta.author,
          repository,
          source,
          license,
          licenseText,
        })
      }

      if (pluginOptions.outputFilename !== false) {
        this.emitFile({
          type: 'asset',
          source: JSON.stringify(licenseMeta, null, 2),
          fileName: pluginOptions.outputFilename ?? 'oss-licenses.json',
        })
      }

      if (pluginOptions.additionalFiles) {
        for (const fileName of Object.keys(pluginOptions.additionalFiles)) {
          const source =
            await pluginOptions.additionalFiles[fileName](licenseMeta)
          this.emitFile({ type: 'asset', source, fileName })
        }
      }
    },
  }
}

export function createViteLicensePlugin(
  pluginOptions: PluginOptions = {}
): VitePlugin {
  const pluginName = 'vite-license-plugin'

  return {
    ...createRollupLicensePlugin(pluginOptions, pluginName),
    name: pluginName,
    apply: 'build',
  }
}
