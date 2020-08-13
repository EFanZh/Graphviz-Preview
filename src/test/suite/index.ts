import * as glob from "glob";
import * as Mocha from "mocha";
import * as path from "path";

export function run(): Promise<void> {
    const mocha = new Mocha({
        timeout: 120000,
        ui: "tdd",
        color: true
    });

    const testsRoot = path.resolve(__dirname, "..");

    return new Promise((c, e) => {
        glob(
            "**/**.test.js",
            {
                cwd: testsRoot
            },
            (err, files) => {
                if (err) {
                    return e(err);
                }

                files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

                try {
                    mocha.run((failures) => {
                        if (failures > 0) {
                            e(new Error(`${failures} tests failed.`));
                        } else {
                            c();
                        }
                    });
                } catch (err) {
                    e(err);
                }
            }
        );
    });
}
