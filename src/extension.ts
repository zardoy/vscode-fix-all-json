/* eslint-disable no-await-in-loop */
import { builtinModules } from 'module'
import { registerExtensionCommand, registerActiveDevelopmentCommand, registerNoop, showQuickPick } from 'vscode-framework'
import vscode from 'vscode'

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

    // jumpy like fixes
    registerNoop('Pick problems by source', async () => {
        const document = vscode.window.activeTextEditor?.document
        if (document === undefined) return
        // lodash-marker
        const diagnosticsByGroup: Record<string, vscode.Diagnostic[]> = {}
        const diagnostics = vscode.languages.getDiagnostics(document.uri)
        for (const diagnostic of diagnostics) {
            const source = diagnostic.source ?? 'No source'
            if (!diagnosticsByGroup[source]) diagnosticsByGroup[source] = []
            diagnosticsByGroup[source]!.push(diagnostic)
        }

        const selectedSource = await showQuickPick(
            Object.entries(diagnosticsByGroup)
                .sort(([, a], [, b]) => a.length - b.length)
                .map(([source, { length }]) => ({ label: source, description: `${length}`, value: source })),
        )
        if (selectedSource === undefined) return
        // snippet like navigation?
    })

    registerNoop('Fix json issues', async () => {
        const currentEditor = vscode.window.activeTextEditor
        if (currentEditor === undefined) return
        const { document } = currentEditor
        // TODO add jsonc
        if (document.isClosed || !['json'].includes(document.languageId)) return

        const diagnostics = vscode.languages.getDiagnostics(document.uri)

        if (diagnostics.length === 0) {
            console.warn('Everything is clean')
            return
        }

        console.time('process')
        await currentEditor.edit(edit => {
            for (const problem of diagnostics)
                switch (problem.message) {
                    // 514 code optionally check source=json
                    case 'Expected comma': {
                        const { line, character } = problem.range.start
                        edit.insert(new vscode.Position(line - 1, character + 1), ',')
                        break
                    }

                    // these two are quite simple
                    // 519
                    case 'Trailing comma':
                        edit.delete(problem.range)
                        break

                    // why no source and code?
                    case 'Comments are not permitted in JSON.':
                        edit.delete(problem.range)
                        break
                    case 'Property keys must be doublequoted': {
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
                        break
                    }

                    default:
                        break
                }
        })
        console.timeEnd('process')
    })
}
