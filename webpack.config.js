const path = require("path");

module.exports = {
    entry: {
        bundle: "./out/preview/main.js"
    },
    output: {
        path: path.resolve(__dirname, "out", "preview"),
        filename: "[name].js"
    },
    mode: "development"
}
