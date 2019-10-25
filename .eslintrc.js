module.exports = {
  "root": true,
  "extends": ["eslint:recommended"],
  "env": {
    "es6": true
  },
  "parserOptions": {
    "ecmaVersion": 2018
  },
  "rules": {
    "no-undef": 2,
    "no-unused-vars": 0,
    "no-console": 0,
    "prefer-const": 2,
    "no-var": 2,
    "quotes": ["error", "single", { "allowTemplateLiterals": true }],
    "prefer-template": 2,
    "no-useless-concat": 2,
    "prefer-rest-params": 2,
    "space-before-function-paren": ["error", {
      "anonymous": "always",
      "named": "never",
      "asyncArrow": "ignore"
    }],
    "space-before-blocks": 2,
    "arrow-spacing": 2,
    "one-var": ["error", "never"],
    "eqeqeq": 2,
    "keyword-spacing": 2,
    "space-infix-ops": 2,
    "no-whitespace-before-property": 2,
    "space-in-parens": 2,
    "array-bracket-spacing": 2,
    "object-curly-spacing": ["error", "always"],
    "semi": 2
  }
};
