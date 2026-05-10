import subprocess
import sys
import time

password = "Qijianxin1！"

cmd = [
    "ssh",
    "-o", "StrictHostKeyChecking=no",
    "-o", "NumberOfPasswordPrompts=1",
    "-o", "BatchMode=no",
    "root@117.72.205.240",
    "cd /opt/fillword/server && node -e \"console.log(JSON.stringify({hasPassword: Boolean(process.env.SPARK_API_PASSWORD)}))\""
]

proc = subprocess.Popen(
    cmd,
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    universal_newlines=True,
    bufsize=1
)

output_lines = []
start_time = time.time()
timeout = 30

while time.time() - start_time < timeout:
    line = proc.stdout.readline()
    if line:
        output_lines.append(line)
        print(line, end='')
        if 'password:' in line.lower() or '密码:' in line:
            proc.stdin.write(password + "\n")
            proc.stdin.flush()
        if proc.poll() is not None:
            break
    elif proc.poll() is not None:
        break
    time.sleep(0.1)

remaining = proc.stdout.read()
if remaining:
    print(remaining, end='')
    output_lines.append(remaining)

print("\n--- Full Output ---")
print(''.join(output_lines))
