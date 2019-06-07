import * as testRunner from "vscode/lib/testrunner";

testRunner.configure({
    timeout: 120000,
    ui: "tdd",
    useColors: true
});

module.exports = testRunner;
