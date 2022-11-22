import * as vscode from 'vscode'
import stripJsonComments from 'strip-json-comments'
import { oneOf } from '@zardoy/utils'
import { getExtensionSetting } from 'vscode-framework'
import { getTextByLine, isContainEoL, isNumber, startsWithComment } from './utils'

export default () => {
    vscode.workspace.onDidChangeTextDocument(({ contentChanges, document, reason }) => {
        if (!getExtensionSetting('insertMissingCommaOnEnter')) return

        if (!vscode.languages.match(['json', 'jsonc'], document)) return

        if (contentChanges.length === 0) return

        contentChanges = [...contentChanges].sort((a, b) => a.range.start.compareTo(b.range.start))

        const editor = vscode.window.activeTextEditor

        if (document.uri !== editor?.document.uri || ['output'].includes(editor.document.uri.scheme)) return

        if (vscode.workspace.fs.isWritableFileSystem(document.uri.scheme) === false) return

        if (oneOf(reason, vscode.TextDocumentChangeReason.Undo, vscode.TextDocumentChangeReason.Redo)) return

        if (contentChanges.some(change => !isContainEoL(change.text))) return

        let fileContentWithoutComments: string

        void editor.edit(
            edit => {
                for (const [i, change] of contentChanges.entries()) {
                    const prevLine = document.lineAt(change.range.start.line + i)

                    if (startsWithComment(prevLine.text.trim())) continue

                    const currentLineText = document.lineAt(prevLine.lineNumber + 1).text.trim()

                    const isCurrentLineEmpty = currentLineText.trim() === ''
                    const isCurrentLineStartsWithComment = startsWithComment(currentLineText)

                    if (!isCurrentLineEmpty && !isCurrentLineStartsWithComment) continue

                    fileContentWithoutComments ??= stripJsonComments(document.getText())

                    const prevLineTextWithoutComments = getTextByLine(fileContentWithoutComments, prevLine.lineNumber)!

                    const prevLineLastChar = prevLineTextWithoutComments.trimEnd().at(-1)

                    if (!prevLineLastChar) continue

                    const isMatchValue = prevLineLastChar === '}' || prevLineLastChar === '"' || prevLineLastChar === ']' || isNumber(prevLineLastChar)

                    if (!isMatchValue) continue

                    const insertPostion = new vscode.Position(prevLine.lineNumber, prevLineTextWithoutComments.trimEnd().length)

                    edit.insert(insertPostion, ',')
                }
            },
            { undoStopAfter: false, undoStopBefore: false },
        )
    })
}
