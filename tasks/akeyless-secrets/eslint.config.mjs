import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  pluginJs.configs.recommended,
  {
    files: ["**/*.js"], 
    languageOptions: {sourceType: "commonjs"},
    ignores: ["node_modules/",  ".vscode/", "package.json", "package-lock.json", "task.json", "vss-extension.json" ],
    rules: {
        "eslint-comments/no-use": "off",
        "no-undef": "off",
        "import/no-namespace": "off",
        "import/no-commonjs": "off",
        "i18n-text/no-en": 0,
        "prefer-template": "off",
        "filenames/match-regex": "off",
        "no-unused-vars": "warn",
        "camelcase": "off"
     }
  },{
    languageOptions: { globals: globals.browser }
  }
];