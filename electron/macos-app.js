// NSWorkspace reads the app receiving key events without a System Events
// scripting query. Keep the returned PID so we can restore the same process.
export const FRONTMOST_APP_SCRIPT = 'ObjC.import("AppKit"); var front = $.NSWorkspace.sharedWorkspace.frontmostApplication; front.isNil() ? "" : JSON.stringify({pid: Number(front.processIdentifier), bundleId: ObjC.unwrap(front.bundleIdentifier)});';

export function parseFrontmostApp(output, ownPid) {
  let candidate;
  try { candidate = JSON.parse(String(output).trim()); }
  catch { return null; }
  if (!Number.isSafeInteger(candidate?.pid) || candidate.pid <= 0 || candidate.pid === ownPid) return null;
  return {
    pid: candidate.pid,
    ...(typeof candidate.bundleId === 'string' && candidate.bundleId ? { bundleId: candidate.bundleId } : {})
  };
}

export async function readFrontmostMacApp(execFileAsync, ownPid) {
  const { stdout } = await execFileAsync('osascript', ['-l', 'JavaScript', '-e', FRONTMOST_APP_SCRIPT]);
  return parseFrontmostApp(stdout, ownPid);
}

export async function activateMacApp(execFileAsync, pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('Invalid source app process.');
  const script = `ObjC.import("AppKit"); var target = $.NSRunningApplication.runningApplicationWithProcessIdentifier(${pid}); target.isNil() ? "false" : String(target.activateWithOptions(0));`;
  const { stdout } = await execFileAsync('osascript', ['-l', 'JavaScript', '-e', script]);
  if (stdout.trim() !== 'true') throw new Error('The original app could not be activated.');
}
