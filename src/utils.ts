import * as vscode from 'vscode'
import { oneOf } from '@zardoy/utils'

export function getTextByLine(text: string, line: number) {
    return text.split('\n').at(line)
}

export function isNumber(text: string) {
    return !Number.isNaN(Number.parseInt(text, 10))
}

export function isEoL(text: string) {
    return text.startsWith('\n') && text.trim() === ''
}

export function startsWithComment(text: string) {
    return text.startsWith('//') || text.startsWith('/*')
}

export const onJsonFileChange = (
    callback: (input: { editor: vscode.TextEditor } & Pick<vscode.TextDocumentChangeEvent, 'contentChanges' | 'document'>) => void | Promise<void>,
) => {
    vscode.workspace.onDidChangeTextDocument(({ contentChanges, document, reason }) => {
        if (!vscode.languages.match(['json', 'jsonc'], document) || contentChanges.length === 0) return

        const editor = vscode.window.activeTextEditor

        if (
            document.uri !== editor?.document.uri ||
            ['output'].includes(editor.document.uri.scheme) ||
            vscode.workspace.fs.isWritableFileSystem(document.uri.scheme) === false ||
            oneOf(reason, vscode.TextDocumentChangeReason.Undo, vscode.TextDocumentChangeReason.Redo)
        ) {
            return
        }

        contentChanges = [...contentChanges].sort((a, b) => a.range.start.compareTo(b.range.start))

        void callback({ editor, document, contentChanges })
    })
}
