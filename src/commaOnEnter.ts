import * as vscode from 'vscode'
import stripJsonComments from 'strip-json-comments'
import { getExtensionSetting } from 'vscode-framework'
import { getTextByLine, isEoL, isNumber, onJsonFileChange, startsWithComment } from './utils'

export default () => {
    onJsonFileChange(({ contentChanges, editor, document }) => {
        if (!getExtensionSetting('insertMissingCommaOnEnter')) return
        if (contentChanges.some(change => !isEoL(change.text))) return

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
