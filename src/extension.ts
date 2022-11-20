import * as vscode from 'vscode'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'

export const activate = () => {
    vscode.languages.registerCodeActionsProvider(
        { language: 'jsonc' },
        {
            provideCodeActions(document, range, { diagnostics }) {
                const problem = diagnostics[0]
                if (!problem || problem.message !== 'Incorrect type. Expected "array".') return
                const stringIntoArrayFix = new vscode.CodeAction('Turn into array', vscode.CodeActionKind.QuickFix)
                stringIntoArrayFix.isPreferred = true
                stringIntoArrayFix.diagnostics = [problem]
                stringIntoArrayFix.edit = new vscode.WorkspaceEdit()
                stringIntoArrayFix.edit.replace(document.uri, problem.range, `[${document.getText(problem.range)}]`)
                return [stringIntoArrayFix]
            },
        },
    )

    const performFixes = async () => {
        const currentEditor = vscode.window.activeTextEditor
        if (currentEditor === undefined || currentEditor.viewColumn === undefined) return

        const { document } = currentEditor
        // TODO test jsonc
        if (document.isClosed || !['json', 'jsonc'].includes(document.languageId)) return

        const diagnostics = vscode.languages.getDiagnostics(document.uri)

        if (diagnostics.length === 0) {
            console.warn('Everything is clean')
            return
        }

        console.time('process')
        const enableFixes = getExtensionSetting('enableFixes')
        let needsFormatter = false
        await currentEditor.edit(edit => {
            for (const problem of diagnostics) {
                const { line, character } = problem.range.start

                const pos = new vscode.Position(line, character)
                switch (problem.message) {
                    // 514 code optionally check source=json
                    case 'Expected comma': {
                        if (!enableFixes.insertMissingCommas) continue
                        // if (character === document.lineAt(line).firstNonWhitespaceCharacterIndex) {
                        //     console.log('one line')
                        //     edit.insert(new vscode.Position(line - 1, document.lineAt(line).range.end.character), ',')
                        //     break
                        // }

                        edit.insert(pos, ',')
                        needsFormatter = true
                        break
                    }

                    // these three are quite simple
                    // 519
                    case 'Trailing comma':
                        if (!enableFixes.removeTrailingCommas) continue
                        edit.delete(problem.range)
                        break

                    // 515
                    case 'Colon expected':
                        if (!enableFixes.insertMissingColon) continue
                        edit.insert(pos, ':')
                        needsFormatter = true
                        break
                    // why no source and code?
                    case 'Comments are not permitted in JSON.':
                        if (!enableFixes.removeComments) continue
                        edit.delete(problem.range)
                        needsFormatter = true
                        break
                    case 'Property keys must be doublequoted': {
                        if (!enableFixes.fixDoubleQuotes) continue
                        const { start, end } = problem.range
                        const problemWord = document.getText(problem.range)
                        const removeQuotes = /([`']).+\1/.exec(problemWord)
                        if (removeQuotes) {
                            edit.delete(
                                new vscode.Range(new vscode.Position(start.line, start.character), new vscode.Position(start.line, start.character + 1)),
                            )
                            edit.delete(new vscode.Range(new vscode.Position(end.line, end.character - 1), new vscode.Position(end.line, end.character)))
                        }

                        edit.insert(new vscode.Position(start.line, start.character), '"')
                        edit.insert(new vscode.Position(end.line, end.character), '"')
                        needsFormatter = true
                        break
                    }

                    default:
                        break
                }
            }
        })
        // we're actually running formatter twice (before and after this)
        if (needsFormatter && getExtensionSetting('runFormatter')) await vscode.commands.executeCommand('editor.action.formatDocument')
        console.timeEnd('process')
    }

    registerExtensionCommand('fixFile', async () => performFixes())

    vscode.workspace.onWillSaveTextDocument(({ waitUntil, reason }) => {
        if (!getExtensionSetting('runOnSave') || reason === vscode.TextDocumentSaveReason.AfterDelay) return
        waitUntil(performFixes())
    })
}
