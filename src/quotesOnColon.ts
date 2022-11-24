import * as vscode from 'vscode'
import { oneOf } from '@zardoy/utils'
import { getExtensionSetting } from 'vscode-framework'
import { onJsonFileChange } from './utils'

export default () => {
    onJsonFileChange(({ contentChanges, document, editor }) => {
        if (!getExtensionSetting('insertMissingDoubleQuotesOnColon')) return

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
