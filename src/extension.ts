// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

let lockedDecorationType: vscode.TextEditorDecorationType;
let statusBarItem: vscode.StatusBarItem;
// Add tracking for locked groups
let lockedGroups = new Set<number>();

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "rustc-dev" is now active!');

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.backgroundColor = new vscode.ThemeColor(
    "statusBarItem.errorBackground"
  );

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

  let disposable_jts = vscode.commands.registerCommand(
    "rustc-dev.run_with_jts",
    () => {
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
    }
  );
  context.subscriptions.push(disposable_jts);

  let focus_current_file = vscode.commands.registerCommand(
    "common.lock_current_file",
    async () => {
      let editor = vscode.window.activeTextEditor;
      if (editor) {
        await vscode.commands.executeCommand(
          "workbench.action.closeOtherEditors"
        );
        await vscode.commands.executeCommand(
          "workbench.action.lockEditorGroup"
        );

        // Store current group ID
        const currentGroup = vscode.window.tabGroups.activeTabGroup;
        const groupIndex = vscode.window.tabGroups.all.indexOf(currentGroup);
        lockedGroups.add(groupIndex);

        // Update status bar
        const filePath = editor.document.uri.fsPath;
        const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        const relativePath = workspacePath
          ? path.relative(workspacePath, filePath)
          : filePath;
        statusBarItem.text = `${relativePath} locked`;
        statusBarItem.show();
      }
    }
  );
  context.subscriptions.push(focus_current_file);

  let unlock_handler = vscode.commands.registerCommand(
    "common.unlock_current_file",
    async () => {
      // const currentGroup = vscode.window.tabGroups.activeTabGroup;
      // const groupIndex = vscode.window.tabGroups.all.indexOf(currentGroup);

      // Only unlock previously locked groups

      await vscode.commands.executeCommand(
        "workbench.action.focusFirstEditorGroup"
      );
      await vscode.commands.executeCommand(
        "workbench.action.unlockEditorGroup"
      );

      // Clear tracking and hide status bar
      lockedGroups.clear();
      // Hide status bar and clear tracked files
      statusBarItem.hide();
    }
  );
  context.subscriptions.push(unlock_handler);

  let goto_file_end = vscode.commands.registerCommand(
    "common.goto_end_of_file",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const lastLine = editor.document.lineCount - 1;
        const lastChar = editor.document.lineAt(lastLine).text.length;
        const pos = new vscode.Position(lastLine, lastChar);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos));
      }
    }
  );
  context.subscriptions.push(goto_file_end);

  let goto_file_begin = vscode.commands.registerCommand(
    "common.goto_beginning_of_file",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const pos = new vscode.Position(0, 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos));
      }
    }
  );
  context.subscriptions.push(goto_file_begin);
}

// This method is called when your extension is deactivated
export function deactivate() {}
