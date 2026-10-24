#!/usr/bin/env python3
"""Run age in passphrase (scrypt) mode without a terminal (Ops 1 part B, master plan 19.1).

age reads a passphrase only from the terminal, never from a pipe or an environment variable, so a CI job cannot call
`age -p` directly. This wrapper gives age a pseudo-terminal, answers its prompts from the environment variable
BACKUP_PASSPHRASE and passes the files on the command line. The passphrase is never written to a file, to the
command line or to the output.

  age-pass.py encrypt IN OUT      IN (plain) to OUT (age file)
  age-pass.py decrypt IN OUT      IN (age file) to OUT (plain)
"""
import os
import pty
import re
import sys

PROMPT = re.compile(rb"passphrase[^:\n]*:\s*$", re.IGNORECASE)


def main() -> int:
    if len(sys.argv) != 4 or sys.argv[1] not in ("encrypt", "decrypt"):
        print(__doc__, file=sys.stderr)
        return 2
    mode, src, dst = sys.argv[1:]
    passphrase = os.environ.get("BACKUP_PASSPHRASE", "")
    if len(passphrase) < 12:
        print("BACKUP_PASSPHRASE is missing or shorter than 12 characters", file=sys.stderr)
        return 2
    args = ["age", "-p", "-o", dst, src] if mode == "encrypt" else ["age", "-d", "-o", dst, src]
    pid, fd = pty.fork()
    if pid == 0:
        os.execvp("age", args)
    seen = b""
    handled = 0
    while True:
        try:
            chunk = os.read(fd, 4096)
        except OSError:
            break
        if not chunk:
            break
        seen += chunk
        tail = seen[handled:]
        if PROMPT.search(tail):
            os.write(fd, passphrase.encode() + b"\n")
            handled = len(seen)
    _, status = os.waitpid(pid, 0)
    code = os.waitstatus_to_exitcode(status)
    if code != 0:
        # age's own messages never contain the passphrase (the terminal does not echo it).
        msg = re.sub(rb"\x1b\[[0-9;?]*[A-Za-z]", b"", seen).decode(errors="replace").strip()
        print(f"age {mode} failed (exit {code}): {msg[-300:]}", file=sys.stderr)
    return code


if __name__ == "__main__":
    sys.exit(main())
