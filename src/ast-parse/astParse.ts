import { transformationMap } from './transformations/index'
import { SFCDescriptor, vueSfcAstParser } from '@originjs/vue-sfc-ast-parser'
import * as globby from 'globby'
import fs from 'fs'
import { JSCodeshift } from 'jscodeshift/src/core';

export type FileInfo = {
  path: string,
  source: string
}

export type VueSFCContext = {
  path: string
  source: string
  // templateAST: ESLintProgram,
  templateAST: any,
  scriptAST: any,
  jscodeshiftParser: JSCodeshift,
  descriptor: SFCDescriptor
}

export function astParseRoot (rootDir: string) {
  const resolvedPaths : string[] = globby.sync(rootDir)
  resolvedPaths.forEach(filePath => {
    // skip files in node_modules
    if (filePath.indexOf('/node_modules/') >= 0) {
      return
    }

    const extension = (/\.([^.]*)$/.exec(filePath) || [])[0]

    let fileChanged: boolean = false
    const source: string = fs.readFileSync(filePath).toString().split('\r\n').join('\n')
    const fileInfo: FileInfo = {
      path: filePath,
      source: source
    }
    let transformationResult: string = source
    let tempTransformationResult: string | null

    // iter all transformations
    for (const key in transformationMap) {
      const transformation = transformationMap[key]

      // filter by file extension
      const extensions: string[] = transformation.extensions
      if (!extensions.includes(extension)) {
        continue
      }

      // execute the transformation
      tempTransformationResult = transformation.transformAST(fileInfo)
      if (tempTransformationResult == null) {
        continue
      }
      fileChanged = true
      transformationResult = tempTransformationResult

      if (transformation.needReparse) {
        fileInfo.source = transformationResult
      }
    }
    if (fileChanged) {
      fs.writeFileSync(filePath, transformationResult)
    }
  })
}

export function parseVueSfc (fileInfo: FileInfo) : VueSFCContext {
  if (!fileInfo.source || fileInfo.source.length === 0) {
    fileInfo.source = fs.readFileSync(fileInfo.path).toString().split('\r\n').join('\n')
  }
  const astParseResult = vueSfcAstParser(fileInfo)
  const context : VueSFCContext = {
    path: fileInfo.path,
    source: fileInfo.source,
    templateAST: astParseResult.templateAST,
    scriptAST: astParseResult.scriptAST,
    jscodeshiftParser: astParseResult.jscodeshiftParser,
    descriptor: astParseResult.descriptor
  }

  return context
}
