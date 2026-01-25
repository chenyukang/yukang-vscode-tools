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
  console.log('Extension "rustc-dev" is now active!');

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

  let run_rust_unit_test_at_cursor = vscode.commands.registerCommand(
    "common.run_rust_unit_test_at_cursor",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const doc = editor.document;
      let lineNum = editor.selection.active.line;
      let foundAttr = false;
      let funcName = "";
      let prevLine = "";
      // Search upwards for #[
      while (lineNum >= 0) {
        const lineText = doc.lineAt(lineNum).text.trim();
        if (!foundAttr && lineText.startsWith("#[")) {
          foundAttr = true;
        }
        if (
          foundAttr &&
          (prevLine.startsWith("fn ") || prevLine.startsWith("async fn "))
        ) {
          // Extract function name
          let match = prevLine.match(/fn\s+([a-zA-Z0-9_]+)/);
          if (match && match[1]) {
            funcName = match[1];
            break;
          }
        }
        prevLine = lineText;
        lineNum--;
      }

      if (funcName) {
        const termCmd = `ct.sh ${funcName}`;
        let terminal;
        if (vscode.window.terminals.length > 0) {
          terminal =
            vscode.window.terminals[vscode.window.terminals.length - 1];
        } else {
          terminal = vscode.window.createTerminal();
        }
        terminal.show();
        terminal.sendText(termCmd);
      } else {
        vscode.window.showWarningMessage(
          "No Rust test function found above cursor."
        );
      }
    }
  );
  context.subscriptions.push(run_rust_unit_test_at_cursor);

  let open_real_source_file = vscode.commands.registerCommand(
    "common.open_real_source_file",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor.");
        return;
      }

      const cursorPosition = editor.selection.active;
      let targetUri: vscode.Uri | undefined;

      const resolveFileUri = (uri: vscode.Uri | undefined): vscode.Uri | undefined => {
        if (!uri) return undefined;
        if (uri.scheme === "file") return uri;
        if (uri.path && path.isAbsolute(uri.path) && fs.existsSync(uri.path)) {
          return vscode.Uri.file(uri.path);
        }
        return undefined;
      };

      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
      const tabInput = activeTab?.input;
      if (tabInput instanceof vscode.TabInputTextDiff) {
        const candidates = [tabInput.original, tabInput.modified];
        targetUri = candidates.map(resolveFileUri).find(Boolean);
        if (!targetUri) {
          targetUri = resolveFileUri(tabInput.original) ?? tabInput.original;
        }
      } else {
        targetUri = resolveFileUri(editor.document.uri) ?? editor.document.uri;
      }

      if (!targetUri || targetUri.scheme !== "file") {
        vscode.window.showWarningMessage(
          "Unable to locate the real source file from the current editor."
        );
        return;
      }

      const targetDoc = await vscode.workspace.openTextDocument(targetUri);
      const targetEditor = await vscode.window.showTextDocument(targetDoc, {
        preview: false,
      });
      const targetPos = new vscode.Position(
        Math.min(cursorPosition.line, targetDoc.lineCount - 1),
        cursorPosition.character
      );
      targetEditor.selection = new vscode.Selection(targetPos, targetPos);
      targetEditor.revealRange(
        new vscode.Range(targetPos, targetPos),
        vscode.TextEditorRevealType.InCenterIfOutsideViewport
      );
    }
  );
  context.subscriptions.push(open_real_source_file);
}

// This method is called when your extension is deactivated
export function deactivate() {}
