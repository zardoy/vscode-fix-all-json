import * as vscode from 'vscode'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'
import registerCommaOnEnter from './commaOnEnter'
import registerQuotesOnColon from './quotesOnColon'

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

    const getJsonFixes = (
        document: vscode.TextDocument,
        diagnostics: readonly vscode.Diagnostic[],
        isSingleCodeActionFix = false,
    ): { workspaceEdit: vscode.WorkspaceEdit; titleOverride?: string } | void => {
        const enableFixes = isSingleCodeActionFix
            ? new Proxy({} as never, {
                  get(target, p, receiver) {
                      return true
                  },
              })
            : getExtensionSetting('enableFixes')
        const edits: vscode.TextEdit[] = []
        const editCallbackBuilder = (cb: (edit: Pick<vscode.TextEditorEdit, 'insert' | 'delete' | 'replace'>) => void) => {
            cb(
                new Proxy({} as any, {
                    get(target, p, receiver) {
                        return (...args) => {
                            edits.push(vscode.TextEdit[p](...args))
                        }
                    },
                }),
            )
        }

        let codeActionTitleOverride: string | undefined

        editCallbackBuilder(edit => {
            for (const problem of diagnostics) {
                const pos = problem.range.start

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
                        codeActionTitleOverride = 'Insert comma'
                        break
                    }

                    // these three are quite simple
                    // 519
                    case 'Trailing comma':
                        if (!enableFixes.removeTrailingCommas) continue
                        edit.delete(problem.range)
                        codeActionTitleOverride = 'Remove trailing comma'
                        break
                    // 515
                    case 'Colon expected':
                        if (!enableFixes.insertMissingColon) continue
                        edit.insert(pos, ':')
                        codeActionTitleOverride = 'Insert colon'
                        break
                    // why no source and code?
                    case 'Comments are not permitted in JSON.':
                        if (!enableFixes.removeComments) continue
                        edit.delete(problem.range)
                        codeActionTitleOverride = 'Remove comment'
                        break
                    case 'Property keys must be doublequoted': {
                        if (!enableFixes.fixDoubleQuotes) continue
                        const { start, end } = problem.range
                        const problemWord = document.getText(problem.range)
                        const removeQuotes = /^([`']).+\1$/.exec(problemWord)
                        if (removeQuotes) {
                            edit.delete(new vscode.Range(start, start.translate(0, 1)))
                            edit.delete(new vscode.Range(end.translate(0, -1), end))
                        }

                        edit.insert(start, '"')
                        edit.insert(end, '"')
                        codeActionTitleOverride = 'Wrap with double quotes'
                        break
                    }

                    default:
                        break
                }
            }
        })

        if (edits.length === 0) return

        const workspaceEdit = new vscode.WorkspaceEdit()
        workspaceEdit.set(document.uri, edits)

        return {
            workspaceEdit,
            titleOverride: codeActionTitleOverride,
        }
    }

    vscode.languages.registerCodeActionsProvider(['json', 'jsonc'], {
        provideCodeActions(document, range, context) {
            const fixAllRequest = context.only?.contains(vscode.CodeActionKind.SourceFixAll.append('source.fixAll.eslint'))
            if (!fixAllRequest) {
                if (!getExtensionSetting('enableIndividualCodeActions')) return
                // ensure propose one individual fix
                const firstDiagnostic = context.diagnostics[0]
                if (!firstDiagnostic) return
                const fix = getJsonFixes(document, [firstDiagnostic], true)
                if (!fix) return
                return [
                    {
                        title: fix.titleOverride ?? `Fix ${firstDiagnostic.message}`,
                        kind: vscode.CodeActionKind.QuickFix,
                        edit: fix.workspaceEdit,
                    },
                ]
            }

            const { workspaceEdit } = getJsonFixes(document, context.diagnostics) ?? {}
            if (!workspaceEdit) return
            return [
                {
                    title: 'Fix all JSON problems',
                    // diagnostics
                    edit: workspaceEdit,
                    kind: vscode.CodeActionKind.SourceFixAll,
                },
            ]
        },
    })

    registerExtensionCommand('fixFile', async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        const { workspaceEdit } = getJsonFixes(editor.document, vscode.languages.getDiagnostics(editor.document.uri)) ?? {}
        if (!workspaceEdit) return
        await vscode.workspace.applyEdit(workspaceEdit)
    })

    registerCommaOnEnter()
    registerQuotesOnColon()
}
