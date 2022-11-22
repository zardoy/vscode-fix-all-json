import * as vscode from 'vscode'
import stripJsonComments from 'strip-json-comments'
import { oneOf } from '@zardoy/utils'
import { getExtensionSetting } from 'vscode-framework'
import { getTextByLine, isContainEoL, isNumber, startsWithComment } from './utils'

export default () => {
    vscode.workspace.onDidChangeTextDocument(({ contentChanges, document, reason }) => {
        if (!getExtensionSetting('insertMissingCommaOnEnter')) return
        if (!vscode.languages.match(['json', 'jsonc'], document) || contentChanges.length === 0) return

        const editor = vscode.window.activeTextEditor

        contentChanges = [...contentChanges].sort((a, b) => a.range.start.compareTo(b.range.start))

        if (
            document.uri !== editor?.document.uri ||
            ['output'].includes(editor.document.uri.scheme) ||
            vscode.workspace.fs.isWritableFileSystem(document.uri.scheme) === false ||
            oneOf(reason, vscode.TextDocumentChangeReason.Undo, vscode.TextDocumentChangeReason.Redo)
            // eslint-disable-next-line curly
        ) {
            return
        }

        if (contentChanges.some(change => !isContainEoL(change.text))) return

        let fileContentWithoutComments: string

        void editor.edit(
            edit => {
                for (const [i, change] of contentChanges.entries()) {
                    const prevLine = document.lineAt(change.range.start.line + i)

                    const currentLineText = document.lineAt(prevLine.lineNumber + 1).text.trim()

                    const isCurrentLineEmpty = currentLineText.trim() === ''
                    const isCurrentLineStartsWithComment = startsWithComment(currentLineText)

                    if (!isCurrentLineEmpty && !isCurrentLineStartsWithComment) continue

                    fileContentWithoutComments ??= stripJsonComments(document.getText())

                    const prevLineWithoutComments = getTextByLine(fileContentWithoutComments, prevLine.lineNumber)!.trimEnd()

                    if (!prevLineWithoutComments) continue

                    const isGoodEnding =
                        ['}', '"', ']', 'true', 'false'].some(char => prevLineWithoutComments.endsWith(char)) || isNumber(prevLineWithoutComments.at(-1)!)

                    if (!isGoodEnding) continue

                    const insertPostion = new vscode.Position(prevLine.lineNumber, prevLineWithoutComments.length)

                    edit.insert(insertPostion, ',')
                }
            },
            { undoStopAfter: false, undoStopBefore: false },
        )
    })
}
