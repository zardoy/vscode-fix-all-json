import * as vscode from 'vscode'
import { oneOf } from '@zardoy/utils'
import { getExtensionSetting } from 'vscode-framework'

export default () => {
    vscode.workspace.onDidChangeTextDocument(({ contentChanges, document, reason }) => {
        if (!getExtensionSetting('insertMissingDoubleQuotesOnColon')) return
        if (!vscode.languages.match(['json', 'jsonc'], document) || contentChanges.length === 0) return

        const editor = vscode.window.activeTextEditor

        contentChanges = [...contentChanges].sort((a, b) => a.range.start.compareTo(b.range.start))

        if (
            document.uri !== editor?.document.uri ||
            ['output'].includes(editor.document.uri.scheme) ||
            vscode.workspace.fs.isWritableFileSystem(document.uri.scheme) === false ||
            oneOf(reason, vscode.TextDocumentChangeReason.Undo, vscode.TextDocumentChangeReason.Redo)
        ) {
            return
        }

        const diagnostics = vscode.languages.getDiagnostics(document.uri)

        if (diagnostics.length === 0) return

        if (contentChanges.some(change => change.text !== ':')) return

        void editor.edit(async edit => {
            for (const change of contentChanges) {
                const problem = diagnostics.find(diagnostic => {
                    const diagnosticPosition = diagnostic.range.end
                    const changePosition = change.range.end

                    return diagnosticPosition.line === changePosition.line && diagnosticPosition.character === changePosition.character
                })

                if (!problem || problem.message !== 'Property keys must be doublequoted') continue

                const { start, end } = problem.range

                const problemWord = document.getText(problem.range)
                const removeQuotes = /^([`']).+\1$/.test(problemWord)

                if (removeQuotes) {
                    edit.delete(new vscode.Range(start, start.translate(0, 1)))
                    edit.delete(new vscode.Range(end.translate(0, -1), end))
                }

                edit.insert(start, '"')
                edit.insert(end, '"')
            }
        })
    })
}
