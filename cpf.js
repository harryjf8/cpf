#!/usr/bin/env node

// Imports
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";

// Get the filename from the first argument after the binary is executed
const file = process.argv[2];

// Check if the user added an argument at all, if they didn't then run this block
if (!file) {
	console.error("Usage: cpf <file to copy>");
	process.exit(1);
}

// Variable to store the file contents as UTF-8 text
let contents;

// Now try to read the file
try {
	contents = await readFile(file, "utf8");
} catch (err) {
	console.error(`cpf: err: ${err.message}`);	// This shows if no valid file is found
	process.exit(1);
}

// Send the file contents to the system clipboard
function copy(command, args = []) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			// Pipe the file contents to stdin
			// Ignore stdout, but show stderr
			stdio: ["pipe", "ignore", "inherit"],
		});

		child.on("error", reject);

		// If exit code 0 then the command worked properly
		child.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`${command} exited with code ${code}`));
			}
		});

		child.stdin.end(contents);
	});
}

async function main() {
	const platform = os.platform();

	// For MacOS
	if (platform === "darwin") {
		await copy("pbcopy");
		return;
	}

	// For Windows
	if (platform === "win32") {
		await copy("clip");
		return;
	}

	// Linux can have different clipboard programs so
	// adjust the command to the desktop environment
	//
	// Try several in case one doesn't work
	if (platform === "linux") {
		const clipboardCommands = [
			["xclip", ["-selection", "clipboard"]],
			["xsel", ["--clipboard", "--input"]],
			["wl-copy", []],
		];

		// Iterate through the clipboard programs
		for (const [command, args] of clipboardCommands) {
			try {
				await copy(command, args);
				return;
			} catch {
				// Clipboard program missing or failed, tries next one
			}
		}

		// Shows if none of the programs were available or worked
		throw new Error(
			"No clipboard utility found. Install xclip, xsel, or wl-clipboard."
		);
	}

	throw new Error(`Unsupported platform: ${platform}`);
}

try {
	await main();
	console.log(`Copied ${file} to clipboard.`);
} catch (err) {
	console.error(`cpf: err: ${err.message}`);
	process.exit(1);
}
