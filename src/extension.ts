// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { FileCoverageDataProvider, CoverageNode} from './dataProvider';
import { CoverageParser } from './coverage-system/coverage-parser';
import { FilesLoader, Config } from './coverage-system/files-loader';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscodeKoverage" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	const outputChannel = vscode.window.createOutputChannel(`koverage`);
	const config = new Config();
	const fileCoverageDataProvider = new FileCoverageDataProvider(vscode.workspace.rootPath, new CoverageParser(outputChannel), new FilesLoader(config));
	// vscode.window.registerTreeDataProvider(
	// 	'vscodeKoverage', new FileCoverageDataProvider(vscode.workspace.rootPath, new CoverageParser(outputChannel), new FilesLoader(config))

	// );
	vscode.window.createTreeView('vscodeKoverage', {
		treeDataProvider: fileCoverageDataProvider
	});
	
	vscode.commands.registerCommand('vscodeKoverage.refresh', () =>
		fileCoverageDataProvider.refresh()
	);
	//TODO fix this command
	vscode.commands.registerCommand('vscodeKoverage.openFile', (node: CoverageNode) =>
		vscode.commands.executeCommand('vscode.open', node.label)
	);

	//TODO search, collapse all, expand all and view as tree/flat (filters? Only low, or < Coverage level)
	//context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }