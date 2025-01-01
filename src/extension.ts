// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "rustc-dev" is now active!');

  let disposable_openrs = vscode.commands.registerCommand(
    "rustc-dev.openTestFile",
    () => {
      let editor = vscode.window.activeTextEditor;
      if (editor) {
        let filePath = editor.document.uri.fsPath;
        let fileExtension = path.extname(filePath);
        let newFilePath = filePath;
        if (fileExtension == ".stderr" || fileExtension == ".fixed") {
          newFilePath = filePath.replace(fileExtension, ".rs");
        } else if (fileExtension == ".rs") {
          newFilePath = filePath.replace(fileExtension, ".stderr");
        }
        if (fs.existsSync(newFilePath)) {
          vscode.commands.executeCommand(
            "vscode.open",
            vscode.Uri.file(newFilePath)
          );
        } else {
          vscode.window.showWarningMessage(
            `File ${newFilePath} does not exist.`
          );
        }
      }
    }
  );
  context.subscriptions.push(disposable_openrs);

  let disposable_jts = vscode.commands.registerCommand("rustc-dev.run_with_jts", () => {
    let editor = vscode.window.activeTextEditor;
    if (editor) {
      if (vscode.workspace.workspaceFolders) {
        let workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        console.log("workspacePath: ", workspacePath);
        let filePath = editor.document.uri.fsPath;
        let fileExtension = path.extname(filePath);
        let relativePath = path.relative(workspacePath, filePath);
        let newFilePath = relativePath;
        if (fileExtension == ".stderr") {
          newFilePath = relativePath.replace(fileExtension, ".rs");
        }
        let terminal;
        if (vscode.window.terminals.length > 0) {
          terminal =
            vscode.window.terminals[vscode.window.terminals.length - 1];
        } else {
          terminal = vscode.window.createTerminal();
        }
        console.log("newFilePath: ", newFilePath);
        terminal.show();
        terminal.sendText(`j ts ${newFilePath}`);
      } else {
        vscode.window.showErrorMessage("No workspace open.");
      }
    }
  });
  context.subscriptions.push(disposable_jts);

  let focus_current_file = vscode.commands.registerCommand(
    "common.closeAndLock",
    async () => {
      let editor = vscode.window.activeTextEditor;
      if (editor) {
        await vscode.commands.executeCommand(
          "workbench.action.closeOtherEditors"
        );
        await vscode.commands.executeCommand(
          "workbench.action.lockEditorGroup"
        );
      }
    }
  );
  context.subscriptions.push(focus_current_file);
}

// This method is called when your extension is deactivated
export function deactivate() {}
