/* eslint-disable no-await-in-loop */
import { builtinModules } from 'module'
import { registerExtensionCommand, registerActiveDevelopmentCommand, registerNoop, showQuickPick } from 'vscode-framework'
import vscode from 'vscode'

export const activate = () => {
    const folder = vscode.workspace.workspaceFolders?.[0]
    if (!folder) {
        console.warn('no folder')

        return
    }

    const tsPattern = new vscode.RelativePattern(folder, '*.{ts,mts,mjs}')
    const jsonPattern = new vscode.RelativePattern(folder, '*.json')

    vscode.languages.registerCodeActionsProvider(
        { language: 'typescript', pattern: tsPattern },
        {
            provideCodeActions(document, range, { diagnostics }) {
                const problem = diagnostics[0]
                if (problem?.code !== 2304) return
                const module = /'(.+)'\.$/.exec(problem.message)?.[1]
                if (!module) {
                    console.warn("Can't extract module name", problem)
                    return
                }

                if (!builtinModules.includes(module)) return
                const quickFix = new vscode.CodeAction(`Import node module ${module}`, vscode.CodeActionKind.QuickFix)
                quickFix.isPreferred = true
                quickFix.diagnostics = [problem]
                return [quickFix]
            },
            // resolveCodeAction(action) {
            //     console.log(action)
            //     return action
            // }
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

    // vscode.languages.registerCodeActionsProvider(
    //     { language: 'jsonc', pattern: jsonPattern },
    //     {
    //         provideCodeActions(document, range, context) {
    //             // document.
    //     const diagnostics = vscode.languages.getDiagnostics(document.uri)

    //             return [new vscode.CodeAction('Turn string into array', vscode.CodeActionKind.QuickFix)]
    //         },
    //     },
    // )

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
