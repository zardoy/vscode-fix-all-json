import * as vscode from 'vscode'
import stringDedent from 'string-dedent'

export const clearEditorText = async (editor: vscode.TextEditor, resetContent = '') => {
    await new Promise<void>(resolve => {
        const { document } = editor
        if (document.getText() === resetContent) {
            resolve()
            return
        }

        const { dispose } = vscode.workspace.onDidChangeTextDocument(({ document }) => {
            if (document.uri !== editor.document.uri) return
            dispose()
            resolve()
        })
        void editor.edit(builder =>
            builder.replace(new vscode.Range(new vscode.Position(0, 0), document.lineAt(document.lineCount - 1).range.end), resetContent),
        )
    })
}

export const setupFixtureContent = async (editor: vscode.TextEditor, content: string) => {
    await clearEditorText(editor, stringDedent(content))
}
