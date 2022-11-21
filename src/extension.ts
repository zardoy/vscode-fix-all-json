/* eslint-disable curly */

import * as vscode from 'vscode'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'
import stripJsonComments from 'strip-json-comments'
import { oneOf } from '@zardoy/utils'
import { getTextByLine, isContainEoL, isNumber, startsWithComment } from './utils';

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

    vscode.workspace.onDidChangeTextDocument(
        ({ contentChanges, document, reason }) => {
            if (!getExtensionSetting("insertMissingCommaOnEnter")) {
                return;
            }

            if (
                !vscode.languages.match(['json', 'jsonc'], document)
            ) {
                return;
            }

            if (contentChanges.length === 0) {
                return;
            }

            contentChanges = [...contentChanges].sort((a, b) => a.range.start.compareTo(b.range.start))

            const editor = vscode.window.activeTextEditor;

            if (
                document.uri !== editor?.document.uri ||
                ["output"].includes(editor.document.uri.scheme)
            ) {
                return;
            }

            if (
                vscode.workspace.fs.isWritableFileSystem(
                    document.uri.scheme
                ) === false
            ) {
                return;
            }

            if (oneOf(reason, vscode.TextDocumentChangeReason.Undo, vscode.TextDocumentChangeReason.Redo)) {
                return
            }

            if (contentChanges.some((change) => !isContainEoL(change.text))) {
                return;
            }

            void editor.edit((edit) => {
                for (const [i, change] of contentChanges.entries()) {
                    const prevLinePosition = change.range.start;

                    const prevLine = document.lineAt(prevLinePosition.line + i);
                    const prevLineText = prevLine.text;

                    const prevLineLastChar = prevLineText.at(-1);

                    if (!prevLineLastChar) {
                        continue;
                    }

                    if (startsWithComment(prevLine.text.trim())) {
                        continue;
                    }

                    const textWithouComments = stripJsonComments(document.getText());
                    const prevLineTextWithoutComments = getTextByLine(textWithouComments, prevLine.lineNumber)?.trim();

                    if (prevLineTextWithoutComments !== prevLineText.trim()) {
                        continue;
                    }

                    const currentLineText = document.lineAt(prevLine.lineNumber + 1).text.trim();

                    const isCurrentLineEmpty =
                        currentLineText.trim() === "";
                    const isCurrentLineBeforeComment = startsWithComment(currentLineText);

                    const isMatchValue =
                        prevLineLastChar === "}" ||
                        prevLineLastChar === '"' ||
                        prevLineLastChar === ']' ||
                        isNumber(prevLineLastChar);


                    if (isMatchValue && (isCurrentLineEmpty || isCurrentLineBeforeComment)) {
                        // In multicursor mode last character position is broken when I use prevLinePosition, IDK why
                        const lastCharacterPosition = new vscode.Position(prevLine.lineNumber, prevLine.range.end.character);
                        edit.insert(lastCharacterPosition, ",");
                    }
                }
            }, { undoStopAfter: false, undoStopBefore: false });
        }
    );
}
