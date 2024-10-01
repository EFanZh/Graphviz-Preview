import esLintJs from "@eslint/js";
import eslintTs from "typescript-eslint";

export default [
    esLintJs.configs.recommended,
    ...eslintTs.configs.strictTypeChecked,
    ...eslintTs.configs.stylisticTypeChecked,
    {
        files: ["**/*.ts"],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/consistent-type-imports": "warn",
            "@typescript-eslint/explicit-member-accessibility": "warn",
            "@typescript-eslint/no-confusing-void-expression": "off", // Temporary.
            "@typescript-eslint/no-floating-promises": "off", // Temporary.
            "@typescript-eslint/no-invalid-void-type": "off", // Temporary.
            "@typescript-eslint/no-misused-promises": "off", // Temporary.
            "@typescript-eslint/no-unnecessary-condition": "off", // Temporary.
            "@typescript-eslint/require-await": "off", // Temporary.
            "@typescript-eslint/restrict-plus-operands": "off", // Temporary.
            "@typescript-eslint/restrict-template-expressions": "off", // Temporary.
            "no-duplicate-imports": "warn",
            "no-multi-spaces": "warn",
            "no-multiple-empty-lines": [
                "warn",
                {
                    max: 1,
                },
            ],
            "padded-blocks": ["warn", "never"],
            quotes: [
                "warn",
                "double",
                {
                    avoidEscape: true,
                },
            ],
            semi: "warn",
            "sort-imports": "warn",
        },
    },
];
