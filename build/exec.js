const child_process = require('child_process');
const { stdout, stderr, stdin } = require('process');


child_process.exec('aria2c ',{shell: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'}, (stderr, stdout, stdin) => {
    if (stderr) {
        console.log(stderr)
    } else if (stdout) {
        console.log(stdout)
    }
});
