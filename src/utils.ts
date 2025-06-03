import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import validateSpdx from 'spdx-expression-validate'
import fetch from 'node-fetch'

import type { PackageMeta, PluginOptions } from './types.js'

const defaultLicenseTextCache: { [license: string]: string } = {}

async function getDefaultLicenseText(license: string) {
  if (!defaultLicenseTextCache[license]) {
    const response = await fetch(
      `https://raw.githubusercontent.com/spdx/license-list-data/main/text/${license}.txt`
    )
    const responseText = await response.text()
    defaultLicenseTextCache[license] = responseText
  }

  return defaultLicenseTextCache[license]
}

export async function readPackageMeta(moduleDir: string): Promise<PackageMeta> {
  const path = join(moduleDir, 'package.json')
  const contents = await readFile(path, 'utf-8')
  return JSON.parse(contents) as PackageMeta
}

export function getRepository(meta: PackageMeta): string | null {
  if (meta.repository && meta.repository.url) {
    return meta.repository.url
  } else if (typeof meta.repository === 'string') {
    return meta.repository
  }

  return null
}

export async function getLicenseFileName(
  moduleDir: string
): Promise<string | undefined> {
  return (await readdir(moduleDir, { withFileTypes: true }))
    .filter((dirent) => !dirent.isDirectory())
    .map((dirent) => dirent.name)
    .find((name) => !!/^licen[cs]e/i.test(name))
}

export async function readLicenseFileContents(path: string) {
  return await readFile(path, 'utf-8')
}

export async function getLicenseText(
  packageId: string,
  license: string,
  moduleDir: string,
  pluginOptions: PluginOptions = {}
): Promise<string | null> {
  const getLicenseFileNameFn =
    pluginOptions.__mocks__?.getLicenseFileName ?? getLicenseFileName
  const readLicenseFileContentsFn =
    pluginOptions.__mocks__?.readLicenseFileContents ?? readLicenseFileContents

  if (license && license.indexOf('SEE LICENSE IN ') === 0) {
    const filename = license.split(' ')[3]
    try {
      return await readLicenseFileContentsFn(join(moduleDir, filename))
    } catch (e) {
      throw new Error(
        `Could not find file specified in package.json license field of ${packageId}`
      )
    }
  }

  const licenseFilename = await getLicenseFileNameFn(moduleDir)

  if (licenseFilename !== undefined) {
    return await readLicenseFileContentsFn(join(moduleDir, licenseFilename))
  }

  if (pluginOptions.replenishDefaultLicenseTexts) {
    return await getDefaultLicenseText(license)
  }

  return null
}

function findPreferredLicense(
  licenses: string[],
  preferredLicenses: string[]
): string | null {
  for (const preferredLicense of preferredLicenses) {
    for (const license of licenses) {
      if (preferredLicense === license) {
        return preferredLicense
      }
    }
  }

  return null
}

export function getLicense(
  packageId: string,
  meta: PackageMeta,
  pluginOptions: PluginOptions = {}
): string {
  let license: string

  if (
    pluginOptions.licenseOverrides &&
    pluginOptions.licenseOverrides[packageId]
  ) {
    license = pluginOptions.licenseOverrides[packageId]
  } else if (typeof meta.license === 'object') {
    license = meta.license.type
  } else if (meta.license) {
    license = meta.license
  } else if (Array.isArray(meta.licenses) && meta.licenses.length > 0) {
    // handle deprecated `licenses` field
    license =
      findPreferredLicense(
        meta.licenses.map((l) => l.type),
        pluginOptions.preferredLicenses ?? []
      ) ?? meta.licenses[0].type
  } else if (typeof meta.licenses === 'string') {
    // handle invalid string values for deprecated `licenses` field
    // unfortunately, these are rather common
    license = meta.licenses
  }

  if (!license) {
    throw new Error(`Could not find license info for ${packageId}`)
  } else if (
    pluginOptions.unacceptableLicenseTest &&
    pluginOptions.unacceptableLicenseTest(license)
  ) {
    throw new Error(`Found unacceptable license "${license}" for ${packageId}`)
  } else if (!validateSpdx(license)) {
    throw new Error(
      `License "${license}" for ${packageId} is not a valid SPDX expression!`
    )
  }

  return license
}
