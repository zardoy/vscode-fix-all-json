import * as vscode from 'vscode'
import stringDedent from 'string-dedent'
import escapeStringRegexp from 'escape-string-regexp'
import fs from 'fs'
import { join } from 'path'

const testingFile = join(__dirname, '../temp.json')
const testingFileUri = vscode.Uri.file(testingFile)

export const prepareFileEditor = async () => {
    if (vscode.window.activeTextEditor?.document.uri.toString() === testingFileUri.toString()) {
        await clearEditorText(vscode.window.activeTextEditor)
        return
    }
    fs.writeFileSync(testingFile, '', 'utf8')
    await vscode.window.showTextDocument(testingFileUri)
    // const document = await vscode.workspace.openTextDocument({
    //     // don't prefil content with \n as vscode won't normalize eol here
    //     content: '',
    //     language: 'jsonc',
    // })
    // await vscode.window.showTextDocument(document)
    // if (process.env.CI) {
    //     await new Promise(resolve => {
    //         setTimeout(resolve, 1000)
    //     })
    // }
}

export const clearEditorText = async (editor: vscode.TextEditor, resetContent = '') => {
    await new Promise<void>(resolve => {
        const { document } = editor
        if (document.getText() === resetContent) {
            resolve()
            return
        }

        const { dispose } = vscode.workspace.onDidChangeTextDocument(({ document }) => {
            if (document.uri !== editor.document.uri) return
            dispose()
            resolve()
        })
        void editor.edit(builder =>
            builder.replace(new vscode.Range(new vscode.Position(0, 0), document.lineAt(document.lineCount - 1).range.end), resetContent),
        )
    })
}

export const getTextNormalizedEol = (document: vscode.TextDocument) => {
    return document.getText().split(/\r?\n/).join('\n')
}

export const setupFixtureContent = async (editor: vscode.TextEditor, content: string) => {
    await clearEditorText(editor, stringDedent(content))
}

export const stringWithPositions = <T extends string>(contents: string, replacements: T[]): [contents: string, positions: Record<T, number[]>] => {
    const cursorPositions = Object.fromEntries(replacements.map(replacement => [replacement, []])) as Record<string, number[]>
    const regex = new RegExp(`(?:${replacements.map(replacement => `(${escapeStringRegexp(replacement)})`).join('|')})`)
    let currentMatch: RegExpExecArray | null | undefined
    while ((currentMatch = regex.exec(contents))) {
        const offset = currentMatch.index
        const matchLength = currentMatch[0]!.length
        contents = contents.slice(0, offset) + contents.slice(offset + matchLength)
        for (const [i, val] of currentMatch.slice(1).entries()) {
            if (!val) continue
            cursorPositions[replacements[i]!]!.push(offset)
            break
        }
    }
    return [contents, cursorPositions]
}

export const offsetToPosition = (string: string, offset: number) => {
    let curOffset = 0
    const lines = string.split('\n')
    for (const [i, line] of lines.entries()) {
        const lineLength = line.length + 1
        curOffset += lineLength
        if (offset < curOffset) return new vscode.Position(i, lineLength - (curOffset - offset))
    }
    return null!
}

export const waitForJsonDiagnostics = (document: vscode.TextDocument) => {
    return new Promise<void>(resolve => {
        vscode.languages.onDidChangeDiagnostics(({ uris }) => {
            if (!uris.map(uri => uri.toString()).includes(document.uri.toString())) return
            if (vscode.languages.getDiagnostics(document.uri).length === 0) return
            resolve()
        })
    })
}
