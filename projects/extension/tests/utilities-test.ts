import * as utilities from "../src/utilities";
import assert from "assert";

describe("Variable resolver tests", () => {
    it("No replacement if no placeholder", () => {
        assert.strictEqual(
            utilities.resolveVariables("abc", () => "xyz"),
            "abc",
        );
    });

    it("No replacement if no key", () => {
        assert.strictEqual(
            utilities.resolveVariables("ab${a}", () => undefined),
            "ab${a}",
        );
    });

    it("Replace if found key", () => {
        assert.strictEqual(
            utilities.resolveVariables("a ${aa} bc ${bb} def ${cc} g", (key) => (key === "aa" ? "foo" : "bar")),
            "a foo bc bar def bar g",
        );
    });

    it("Replace with empty string", () => {
        assert.strictEqual(
            utilities.resolveVariables("a ${aa} bc ${bb} def ${cc} g", () => ""),
            "a  bc  def  g",
        );
    });

    it("Replace mixed", () => {
        assert.strictEqual(
            utilities.resolveVariables("a ${foo} bc ${bar} def ${baz} g", (key) => {
                switch (key) {
                    case "foo":
                        return "xyz";
                    case "baz":
                        return "uvw";
                }

                return undefined;
            }),
            "a xyz bc ${bar} def uvw g",
        );
    });
});
