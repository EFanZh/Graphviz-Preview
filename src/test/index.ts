import * as testRunner from "vscode/lib/testrunner";

testRunner.configure({
    timeout: 60000,
    ui: "tdd",
    useColors: true
});

module.exports = testRunner;
