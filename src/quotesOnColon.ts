import * as vscode from 'vscode'
import { getExtensionSetting } from 'vscode-framework'
import { onJsonFileChange } from './utils'

export default () => {
    onJsonFileChange(({ contentChanges, document, editor }) => {
        if (!getExtensionSetting('insertMissingDoubleQuotesOnColon')) return

        const diagnostics = vscode.languages.getDiagnostics(document.uri)

        if (diagnostics.length === 0) return
        if (contentChanges.some(change => change.text !== ':')) return

        void editor.edit(async edit => {
            let previousLine: number | undefined
            let sameLineChanges = 0
            const translatePos = (pos: vscode.Position) => pos.translate(0, sameLineChanges - 1)
            for (const change of contentChanges) {
                const changePos = change.range.end
                const changePosLine = changePos.line

                if (previousLine === undefined || changePosLine === previousLine) {
                    sameLineChanges++
                } else {
                    // reset on next line
                    sameLineChanges = 1
                }

                previousLine = changePosLine

                const problem = diagnostics.find(
                    diagnostic => diagnostic.range.end.isEqual(changePos) && diagnostic.message === 'Property keys must be doublequoted',
                )

                if (!problem) continue

                const { range } = problem
                const start = translatePos(range.start)
                const end = translatePos(range.end)

                edit.insert(start, '"')
                edit.insert(end, '"')
            }
        })
    })
}
