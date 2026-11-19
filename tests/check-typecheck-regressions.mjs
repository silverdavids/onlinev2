import ts from "typescript";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const git = (args) =>
  execFileSync("git", ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, ...args], {
    encoding: "utf8",
  }).trim();
const changed = git(["diff", "--name-only"])
  .split("\n")
  .filter((file) => /\.tsx?$/.test(file));
const originals = new Map(
  changed.map((file) => [
    path.resolve(file).replaceAll("\\", "/").toLowerCase(),
    execFileSync(
      "git",
      ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, "show", `HEAD:${file}`],
      { encoding: "utf8" },
    ),
  ]),
);
const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
function diagnostics(baseline) {
  const host = ts.createCompilerHost(parsed.options);
  const read = host.readFile.bind(host);
  if (baseline)
    host.readFile = (file) =>
      originals.get(path.resolve(file).replaceAll("\\", "/").toLowerCase()) ?? read(file);
  const program = ts.createProgram(parsed.fileNames, parsed.options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.category === ts.DiagnosticCategory.Error);
}
const before = diagnostics(true);
const after = diagnostics(false);
// Type parameter expansions can change when a caller's union expands while the same
// pre-existing legacy error remains. Match its code and offending source expression.
const key = (d) =>
  `${d.file?.fileName}:${d.code}:${d.file && d.start !== undefined ? d.file.text.slice(d.start, d.start + (d.length ?? 0)) : ts.flattenDiagnosticMessageText(d.messageText, "\n")}`;
const existing = new Set(before.map(key));
const regressions = after.filter((d) => !existing.has(key(d)));
console.log(
  `Baseline TypeScript errors: ${before.length}; current: ${after.length}; new: ${regressions.length}`,
);
if (regressions.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(regressions, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (file) => file,
      getNewLine: () => "\n",
    }),
  );
  process.exitCode = 1;
}
