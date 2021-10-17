/* eslint-disable no-await-in-loop */
import { registerExtensionCommand, registerActiveDevelopmentCommand, registerNoop, showQuickPick } from 'vscode-framework'
import vscode from 'vscode'
import { builtinModules } from 'module'

export const activate = () => {
    // registerExtensionCommand('open-extension-folder', (_, extensionId: string) => {
    //     const path = vscode.extensions.getExtension(extensionId)!.extensionPath
    //     console.log(path)
    // })

    const folder = vscode.workspace.workspaceFolders?.[0]
    if (!folder) {
        console.warn('no folder')

        return
    }

    const tsPattern = new vscode.RelativePattern(folder, '*.{ts,mts,mjs}')
    const jsonPattern = new vscode.RelativePattern(folder, '*.json')

    // vscode.languages.registerCodeActionsProvider(
    //     { language: 'typescript', pattern: tsPattern },
    //     {
    //         provideCodeActions(document, range) {
    //             return [
    //                 new vscode.CodeAction('Import node module ', vscode.CodeActionKind.QuickFix)
    //             ]
    //         },

    //     },
    // )

    //

    registerActiveDevelopmentCommand(() => {
        const document = vscode.window.activeTextEditor?.document
        if (document === undefined) return
        const diagnostics = vscode.languages.getDiagnostics(document.uri).filter(({ source }) => source === 'ts')
        console.log(diagnostics)
    })

    // vscode.languages.registerCodeActionsProvider(
    //     { language: 'json', pattern: jsonPattern },
    //     {
    //         provideCodeActions(document, range, context) {
    //             // document.
    //     const diagnostics = vscode.languages.getDiagnostics(document.uri)

    //             return [new vscode.CodeAction('Turn string into array', vscode.CodeActionKind.QuickFix)]
    //         },
    //     },
    // )

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
